import type { Notification } from './green-api';

export const demoCredentials = {
  idInstance: '3100000000',
  apiTokenInstance: 'demo-token-not-real',
  apiUrl: 'https://3100.api.green-api.com',
};

function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

export function createDemoTransport(): typeof fetch {
  let sequence = 0;
  const queue: { notification: Notification; readyAt: number }[] = [];
  const contacts = [
    {
      chatId: '10000000',
      phone: 79991234567,
      name: 'Анна',
      greeting: 'Привет! Я здесь 👋 Напиши мне, проверим чат.',
    },
    {
      chatId: '20000000',
      phone: 375291234567,
      name: 'Михаил',
      greeting: 'Привет! Это второй демо-чат. Сообщения не смешиваются.',
    },
  ];
  function enqueue(chatId: string, text: string, delay = 0) {
    const contact = contacts.find((item) => item.chatId === chatId)!;
    const receiptId = ++sequence;
    queue.push({
      readyAt: Date.now() + delay,
      notification: {
        receiptId,
        body: {
          typeWebhook: 'incomingMessageReceived',
          idMessage: `demo-incoming-${receiptId}`,
          timestamp: Math.floor((Date.now() + delay) / 1000),
          senderData: {
            chatId,
            chatType: 'user',
            senderName: contact.name,
            senderPhoneNumber: contact.phone,
          },
          messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: text },
          },
        },
      },
    });
  }
  for (const contact of contacts) enqueue(contact.chatId, contact.greeting);
  return async (input, init) => {
    await wait(200, init?.signal);
    const url = new URL(input instanceof Request ? input.url : String(input));
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'v3') parts.shift();
    const [instance, action, token, receiptId] = parts;
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    if (
      url.origin !== demoCredentials.apiUrl ||
      instance !== `waInstance${demoCredentials.idInstance}` ||
      token !== demoCredentials.apiTokenInstance
    )
      return json({ error: 'Неверные демо-данные инстанса.' }, 401);
    switch (action) {
      case 'getSettings':
        return json({
          wid: '10000001',
          typeInstance: 'v3',
          webhookUrl: '',
          incomingWebhook: 'yes',
          outgoingWebhook: 'yes',
          delaySendMessagesMilliseconds: 500,
        });
      case 'getStateInstance':
        return json({ stateInstance: 'authorized' });
      case 'checkAccount': {
        const body = JSON.parse(String(init?.body));
        const contact = contacts.find(
          (item) => item.phone === body.phoneNumber,
        );
        return json({ exist: Boolean(contact), chatId: contact?.chatId ?? '' });
      }
      case 'sendMessage': {
        const body = JSON.parse(String(init?.body));
        if (!contacts.some((item) => item.chatId === body.chatId))
          return json({ error: 'Демо-чат не найден.' }, 400);
        const idMessage = `demo-outgoing-${++sequence}`;
        enqueue(body.chatId, `Получено: «${body.message}»`, 900);
        return json({ idMessage });
      }
      case 'receiveNotification': {
        if (!queue.length || queue[0].readyAt > Date.now())
          await wait(500, init?.signal);
        return json(
          queue[0] && queue[0].readyAt <= Date.now()
            ? queue[0].notification
            : null,
        );
      }
      case 'deleteNotification': {
        const index = queue.findIndex(
          (item) => item.notification.receiptId === Number(receiptId),
        );
        if (index >= 0) queue.splice(index, 1);
        return json({ result: index >= 0 });
      }
      default:
        return json({ error: 'Метод не поддерживается в демо.' }, 404);
    }
  };
}
