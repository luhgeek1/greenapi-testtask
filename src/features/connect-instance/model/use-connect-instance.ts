import { useEffect, useRef, useState } from 'react';
import { errorMessage, GreenApiClient, type Credentials } from '@/shared/api';

export type OnConnect = (client: GreenApiClient, instanceId: string) => void;

export function useConnectInstance(onConnect: OnConnect) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function connect(credentials: Credentials) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const client = new GreenApiClient(credentials);
      await client.connect(controller.signal);
      if (!controller.signal.aborted)
        onConnect(client, credentials.idInstance.trim());
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return { busy, error, connect };
}
