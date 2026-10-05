import { useEffect, useState } from 'react';
import { parseIncoming, type IncomingMessage } from '@/entities/chat';
import { errorMessage, type GreenApiClient } from '@/shared/api';
import { pollNotifications } from './poll-notifications';

export function useReceiveMessages(
  client: GreenApiClient,
  onMessage: (message: IncomingMessage) => void,
) {
  const [error, setError] = useState('');
  const [stopped, setStopped] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void pollNotifications(
      client,
      controller.signal,
      ({ body }) => {
        const incoming = parseIncoming(body);
        if (incoming) onMessage(incoming);
      },
      (cause, paused) => {
        setError(cause ? errorMessage(cause) : '');
        setStopped(paused);
      },
    );
    return () => controller.abort();
  }, [client, onMessage, retry]);

  function restart() {
    setStopped(false);
    setRetry((value) => value + 1);
  }

  return { error, stopped, onRetry: restart };
}
