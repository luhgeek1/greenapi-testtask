import { useCallback, useRef, useState } from 'react';
import {
  addMessage,
  type Chat,
  type IncomingMessage,
  type Message,
} from '@/entities/chat';
import { useCreateChat } from '@/features/create-chat';
import { useReceiveMessages } from '@/features/receive-messages';
import { useSendMessage } from '@/features/send-message';
import type { GreenApiClient } from '@/shared/api';

export function useChatWorkspace(client: GreenApiClient) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const activeRef = useRef<string | null>(null);
  const active = chats.find((chat) => chat.id === activeId);

  const selectChat = useCallback((id: string) => {
    activeRef.current = id;
    setActiveId(id);
    setChats((current) =>
      current.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat)),
    );
  }, []);

  const onCreated = useCallback(
    (chat: Chat) => {
      setChats((current) =>
        current.some((item) => item.id === chat.id)
          ? current
          : [...current, chat],
      );
      selectChat(chat.id);
      setShowNewChat(false);
    },
    [selectChat],
  );

  const onIncoming = useCallback((incoming: IncomingMessage) => {
    setChats((current) => {
      const existing = current.find((chat) => chat.id === incoming.chatId);
      if (!existing)
        return [
          ...current,
          addMessage(
            {
              id: incoming.chatId,
              title: incoming.name,
              phone: incoming.phone,
              unread: 0,
              messages: [],
            },
            incoming.message,
            activeRef.current === incoming.chatId,
          ),
        ];
      return current.map((chat) =>
        chat.id === incoming.chatId
          ? addMessage(
              { ...chat, title: incoming.name },
              incoming.message,
              activeRef.current === chat.id,
            )
          : chat,
      );
    });
  }, []);

  const onSent = useCallback((chatId: string, message: Message) => {
    setChats((current) =>
      current.map((chat) =>
        chat.id === chatId
          ? addMessage(chat, message, activeRef.current === chatId)
          : chat,
      ),
    );
    setDrafts((current) => ({ ...current, [chatId]: '' }));
  }, []);

  const createChat = useCreateChat(client, chats, onCreated);
  const receiving = useReceiveMessages(client, onIncoming);
  const sending = useSendMessage(client, onSent);

  function backToList() {
    activeRef.current = null;
    setActiveId(null);
  }

  function changeDraft(text: string) {
    if (activeId) setDrafts((current) => ({ ...current, [activeId]: text }));
  }

  return {
    chats,
    active,
    activeId,
    showNewChat,
    createChat,
    receiving,
    selectChat,
    backToList,
    changeDraft,
    toggleNewChat: () => setShowNewChat((current) => !current),
    draft: activeId ? (drafts[activeId] ?? '') : '',
    busy: activeId !== null && sending.pendingIds.includes(activeId),
    sendMessage: (text: string) =>
      activeId ? sending.sendMessage(activeId, text) : Promise.resolve(),
  };
}
