export interface Message {
  id: string;
  text: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
}

export interface Chat {
  id: string;
  title: string;
  phone?: string;
  unread: number;
  messages: Message[];
}

export interface IncomingMessage {
  chatId: string;
  name: string;
  phone?: string;
  message: Message;
}

export function addMessage(
  chat: Chat,
  message: Message,
  active: boolean,
): Chat {
  if (
    chat.messages.some(
      (item) => item.id === message.id && item.direction === message.direction,
    )
  )
    return chat;
  return {
    ...chat,
    unread: active
      ? 0
      : chat.unread + (message.direction === 'incoming' ? 1 : 0),
    messages: [...chat.messages, message].sort(
      (a, b) => a.timestamp - b.timestamp,
    ),
  };
}
