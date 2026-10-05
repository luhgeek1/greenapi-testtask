import { useEffect, useRef, useState } from 'react';
import type { Chat } from '@/entities/chat';
import {
  errorMessage,
  normalizePhone,
  type GreenApiClient,
} from '@/shared/api';

export function useCreateChat(
  client: GreenApiClient,
  chats: Chat[],
  onCreated: (chat: Chat) => void,
) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function create() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const normalized = normalizePhone(phone);
      const existing = chats.find((chat) => chat.phone === normalized);
      const id =
        existing?.id ??
        (await client.checkAccount(normalized, controller.signal));
      if (controller.signal.aborted) return;
      onCreated(
        existing ?? {
          id,
          title: `+${normalized}`,
          phone: normalized,
          unread: 0,
          messages: [],
        },
      );
      setPhone('');
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return { phone, onPhoneChange: setPhone, onCreate: create, busy, error };
}
