export const demoCredentials = {
  idInstance: '3100000000',
  apiTokenInstance: 'demo-token-not-real',
  apiUrl: 'https://3100.api.green-api.com',
};

export function createDemoTransport(): typeof fetch {
  let sequence = 0;
  return async (input, init) => {
    const signal = init?.signal;
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      const cancel = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', cancel);
        resolve();
      }, 350);
      signal?.addEventListener('abort', cancel, { once: true });
    });
    const url = new URL(input instanceof Request ? input.url : String(input));
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'v3') parts.shift();
    const [instance, action, token] = parts;
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
        const chatId =
          body.phoneNumber === 79991234567
            ? '10000000'
            : body.phoneNumber === 375291234567
              ? '20000000'
              : '';
        return json({ exist: Boolean(chatId), chatId });
      }
      case 'sendMessage':
      case 'sendFileByUrl':
        return json({ idMessage: `demo-${++sequence}` });
      default:
        return json({ error: 'Метод не поддерживается в демо.' }, 404);
    }
  };
}
