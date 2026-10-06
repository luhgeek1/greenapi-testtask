import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addMessage,
  type Chat,
  type IncomingMessage,
  type Message,
} from '@/entities/chat';
import { useCreateChat } from '@/features/create-chat';
import { useReceiveMessages } from '@/features/receive-messages';
import { useSendMessage } from '@/features/send-message';
import { errorMessage, type GreenApiClient } from '@/shared/api';

export function useChatWorkspace(client: GreenApiClient | null, demo: boolean) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<{
    chatId: string;
    message: string;
  } | null>(null);
  const sessionClient = useRef(client);
  const activeRef = useRef<string | null>(null);
  const active = chats.find((chat) => chat.id === activeId);

  useEffect(() => {
    sessionClient.current = client;
    activeRef.current = null;
    setActiveId(null);
    setChats([]);
    setDrafts({});
    setSendError(null);
    setShowNewChat(true);
  }, [client]);

  const selectChat = useCallback((id: string) => {
    activeRef.current = id;
    setActiveId(id);
    setShowNewChat(false);
    setChats((current) =>
      current.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat)),
    );
  }, []);

  const onCreated = useCallback(
    (chat: Chat) => {
      setChats((current) =>
        current.some((item) => item.id === chat.id)
          ? current.map((item) =>
              item.id === chat.id
                ? { ...item, phone: item.phone ?? chat.phone }
                : item,
            )
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
              {
                ...chat,
                title:
                  incoming.name === incoming.chatId
                    ? chat.title
                    : incoming.name,
                phone: chat.phone ?? incoming.phone,
              },
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
    setDrafts((current) =>
      current[chatId] === message.text ? { ...current, [chatId]: '' } : current,
    );
  }, []);

  const createChat = useCreateChat(
    client,
    chats,
    onCreated,
    demo ? '+7 999 123-45-67' : '',
  );
  const receiving = useReceiveMessages(client, onIncoming);
  const sending = useSendMessage(client, onSent);
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
    selectChat: (id: string) => {
      createChat.onReset();
      selectChat(id);
    },
    changeDraft,
    openNewChat: () => {
      createChat.onReset();
      activeRef.current = null;
      setShowNewChat(true);
    },
    closeNewChat: () => {
      createChat.onReset();
      if (activeId) selectChat(activeId);
    },
    draft: activeId ? (drafts[activeId] ?? '') : '',
    busy: activeId !== null && sending.pendingIds.includes(activeId),
    sendError: sendError?.chatId === activeId ? sendError.message : '',
    sendMessage: async (text: string) => {
      if (!activeId) return;
      const chatId = activeId;
      setSendError(null);
      try {
        await sending.sendMessage(chatId, text);
      } catch (cause) {
        if (client && sessionClient.current === client)
          setSendError({ chatId, message: errorMessage(cause) });
      }
    },
  };
}
