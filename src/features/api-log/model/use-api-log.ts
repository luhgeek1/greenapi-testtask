import { useCallback, useRef, useState } from 'react';
import type { ApiEvent } from '@/shared/api';

export interface RequestResult extends ApiEvent {
  id: number;
}

export function useApiLog() {
  const [history, setHistory] = useState<RequestResult[]>([]);
  const sequence = useRef(0);
  const record = useCallback((event: ApiEvent) => {
    const entry = { ...event, id: ++sequence.current };
    setHistory((current) => [...current.slice(-49), entry]);
  }, []);
  const clear = useCallback(() => setHistory([]), []);
  return { record, history, result: history.at(-1) ?? null, clear };
}
