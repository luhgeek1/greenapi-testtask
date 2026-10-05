import { isRecord } from '../api/greenApi';

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

export function parseIncoming(body: unknown): IncomingMessage | null {
  if (
    !isRecord(body) ||
    body.typeWebhook !== 'incomingMessageReceived' ||
    typeof body.idMessage !== 'string' ||
    typeof body.timestamp !== 'number' ||
    !Number.isFinite(body.timestamp) ||
    !isRecord(body.senderData) ||
    !isRecord(body.messageData)
  )
    return null;
  const sender = body.senderData;
  const data = body.messageData;
  if (
    typeof sender.chatId !== 'string' ||
    !sender.chatId ||
    sender.chatType === 'group' ||
    sender.chatId.startsWith('-')
  )
    return null;
  const text =
    data.typeMessage === 'textMessage' && isRecord(data.textMessageData)
      ? data.textMessageData.textMessage
      : data.typeMessage === 'extendedTextMessage' &&
          isRecord(data.extendedTextMessageData)
        ? data.extendedTextMessageData.text
        : undefined;
  if (typeof text !== 'string') return null;
  return {
    chatId: sender.chatId,
    name: String(
      sender.senderContactName ||
        sender.senderName ||
        sender.chatName ||
        sender.chatId,
    ),
    phone: sender.senderPhoneNumber
      ? String(sender.senderPhoneNumber)
      : undefined,
    message: {
      id: body.idMessage,
      text,
      timestamp: body.timestamp * 1000,
      direction: 'incoming',
    },
  };
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
