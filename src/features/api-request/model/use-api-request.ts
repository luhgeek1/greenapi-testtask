import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  GreenApiClient,
  createDemoTransport,
  errorMessage,
  type ApiResponse,
  type Credentials,
  type SendFileInput,
} from '@/shared/api';

export type ApiOperation =
  | { method: 'getSettings' | 'getStateInstance' }
  | { method: 'sendMessage'; phone: string; message: string }
  | ({ method: 'sendFileByUrl' } & SendFileInput);

export interface RequestResult {
  id: number;
  method: ApiOperation['method'];
  data: unknown;
  status?: number;
  duration: number;
  error: string;
}

export function useApiRequest(demo: boolean) {
  const [transport] = useState(() =>
    demo ? createDemoTransport() : undefined,
  );
  const [pending, setPending] = useState<ApiOperation['method'] | null>(null);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [history, setHistory] = useState<RequestResult[]>([]);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => request.current?.abort(), []);

  async function execute(
    credentials: Credentials,
    operation: ApiOperation,
  ): Promise<RequestResult | null> {
    if (request.current) return null;
    const controller = new AbortController();
    request.current = controller;
    setPending(operation.method);
    setResult(null);
    const started = performance.now();
    try {
      const client = new GreenApiClient(credentials, transport);
      let response: ApiResponse;
      switch (operation.method) {
        case 'getSettings':
          response = await client.getSettings(controller.signal);
          break;
        case 'getStateInstance':
          response = await client.getStateInstance(controller.signal);
          break;
        case 'sendMessage':
          response = await client.sendMessage(
            operation.phone,
            operation.message,
            controller.signal,
          );
          break;
        case 'sendFileByUrl':
          response = await client.sendFileByUrl(operation, controller.signal);
      }
      if (!controller.signal.aborted) {
        const completed: RequestResult = {
          id: ++sequence.current,
          method: operation.method,
          ...response,
          duration: performance.now() - started,
          error: '',
        };
        setResult(completed);
        setHistory((current) => [...current.slice(-29), completed]);
        return completed;
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        const error = errorMessage(cause);
        const completed: RequestResult = {
          id: ++sequence.current,
          method: operation.method,
          data:
            cause instanceof ApiError && cause.data !== undefined
              ? cause.data
              : { error },
          status: cause instanceof ApiError ? cause.status : undefined,
          duration: performance.now() - started,
          error,
        };
        setResult(completed);
        setHistory((current) => [...current.slice(-29), completed]);
        return completed;
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(null);
      }
    }
    return null;
  }

  return {
    execute,
    pending,
    result,
    history,
    clear: () => {
      setResult(null);
      setHistory([]);
    },
  };
}
