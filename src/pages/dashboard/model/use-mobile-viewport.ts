import { useSyncExternalStore } from 'react';

const query = '(max-width: 700px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  const viewport = window.visualViewport;
  media.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);
  viewport?.addEventListener('resize', onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
    viewport?.removeEventListener('resize', onChange);
  };
}

function getHeight() {
  return window.matchMedia(query).matches
    ? (window.visualViewport?.height ?? window.innerHeight)
    : null;
}

export function useMobileViewport() {
  return useSyncExternalStore(subscribe, getHeight);
}
