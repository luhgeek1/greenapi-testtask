import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

function defaultHeight() {
  return window.matchMedia('(max-width: 700px)').matches ? 220 : 176;
}

function clamp(height: number, min: number, max: number) {
  return Math.min(max, Math.max(min, height));
}

export function useTerminalResize() {
  const panel = useRef<HTMLElement>(null);
  const preferredHeight = useRef<number | null>(null);
  const drag = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
  } | null>(null);
  const [resizing, setResizing] = useState(false);
  const [size, setSize] = useState(() => ({
    height: defaultHeight(),
    min: 140,
    max: 600,
  }));

  useEffect(() => {
    const parent = panel.current?.parentElement;
    if (!parent) return;
    function measure() {
      const style = getComputedStyle(parent!);
      const available =
        parent!.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom) -
        parseFloat(style.rowGap);
      const min = 140;
      const max = Math.max(min, Math.floor(available - 260));
      setSize({
        height: clamp(preferredHeight.current ?? defaultHeight(), min, max),
        min,
        max,
      });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  function resize(height: number) {
    const next = clamp(height, size.min, size.max);
    preferredHeight.current = next;
    setSize((current) => ({ ...current, height: next }));
  }

  function stop() {
    drag.current = null;
    setResizing(false);
  }

  function reset() {
    preferredHeight.current = null;
    setSize((current) => ({
      ...current,
      height: clamp(defaultHeight(), current.min, current.max),
    }));
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: size.height,
    };
    setResizing(true);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (active?.pointerId === event.pointerId)
      resize(active.startHeight + active.startY - event.clientY);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const height = {
      ArrowUp: size.height + 24,
      ArrowDown: size.height - 24,
      Home: size.min,
      End: size.max,
    }[event.key];
    if (height === undefined) return;
    event.preventDefault();
    resize(height);
  }

  return {
    panel,
    resizing,
    size,
    handle: {
      onPointerDown: pointerDown,
      onPointerMove: pointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
      onLostPointerCapture: stop,
      onDoubleClick: reset,
      onKeyDown: keyDown,
    },
  };
}
