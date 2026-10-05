import {
  ApiError,
  type GreenApiClient,
  type Notification,
} from '../api/greenApi';

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export async function pollNotifications(
  client: Pick<GreenApiClient, 'receiveNotification' | 'deleteNotification'>,
  signal: AbortSignal,
  onNotification: (notification: Notification) => void,
  onStatus: (error: unknown | null, stopped: boolean) => void,
): Promise<void> {
  let pending: Notification | null = null;
  let processed = false;
  let failures = 0;
  while (!signal.aborted) {
    try {
      if (!pending) {
        pending = await client.receiveNotification(signal);
        if (signal.aborted) return;
        processed = false;
      }
      if (pending) {
        if (!processed) {
          onNotification(pending);
          processed = true;
        }
        await client.deleteNotification(pending.receiptId, signal);
        pending = null;
      }
      if (signal.aborted) return;
      failures = 0;
      onStatus(null, false);

      await delay(500, signal);
    } catch (error) {
      if (signal.aborted) return;
      const stopped =
        error instanceof ApiError &&
        [400, 401, 403].includes(error.status ?? 0);
      onStatus(error, stopped);
      if (stopped) return;
      try {
        await delay(Math.min(1000 * 2 ** failures++, 15_000), signal);
      } catch {
        return;
      }
    }
  }
}
