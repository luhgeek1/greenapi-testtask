import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/entities/chat';
import type { GreenApiClient } from '@/shared/api';

export function useSendMessage(
  client: GreenApiClient,
  onSent: (chatId: string, message: Message) => void,
) {
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const session = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    session.current = controller;
    return () => controller.abort();
  }, [client]);

  async function sendMessage(chatId: string, text: string) {
    const signal = session.current?.signal;
    if (!signal || signal.aborted)
      throw new Error('Подключение закрыто. Войдите заново.');
    if (pending.current.has(chatId)) return;
    pending.current.add(chatId);
    setPendingIds((current) => [...current, chatId]);
    try {
      const id = await client.sendMessage(chatId, text, signal);
      if (signal.aborted) return;
      onSent(chatId, {
        id,
        text,

        timestamp: Math.floor(Date.now() / 1000) * 1000,
        direction: 'outgoing',
      });
    } finally {
      pending.current.delete(chatId);
      if (!signal.aborted)
        setPendingIds((current) => current.filter((id) => id !== chatId));
    }
  }

  return { pendingIds, sendMessage };
}
