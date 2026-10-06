import { isRecord } from '@/shared/api';
import type { IncomingMessage } from '../model/chat';

export function parseIncoming(body: unknown): IncomingMessage | null {
  if (
    !isRecord(body) ||
    body.typeWebhook !== 'incomingMessageReceived' ||
    typeof body.idMessage !== 'string' ||
    !body.idMessage ||
    typeof body.timestamp !== 'number' ||
    !Number.isFinite(body.timestamp) ||
    !Number.isFinite(new Date(body.timestamp * 1000).getTime()) ||
    !isRecord(body.senderData) ||
    !isRecord(body.messageData)
  )
    return null;
  const sender = body.senderData;
  const data = body.messageData;
  if (
    typeof sender.chatId !== 'string' ||
    !/^\d+$/.test(sender.chatId) ||
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
    name:
      [sender.senderContactName, sender.senderName, sender.chatName].find(
        (value): value is string =>
          typeof value === 'string' && Boolean(value.trim()),
      ) ?? sender.chatId,
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
