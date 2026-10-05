export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface Notification {
  receiptId: number;
  body: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizePhone(value: string): string {
  if (!/^\+?[\d\s()-]+$/.test(value.trim())) {
    throw new Error('Введите номер телефона в международном формате.');
  }
  const digits = value.replace(/\D/g, '');
  if (!/^(7\d{10}|375\d{9})$/.test(digits)) {
    throw new Error('MAX API поддерживает номера РФ (+7) и Беларуси (+375).');
  }
  return digits;
}

export class GreenApiClient {
  private readonly credentials: Credentials;

  constructor(credentials: Credentials) {
    const idInstance = credentials.idInstance.trim();
    const apiTokenInstance = credentials.apiTokenInstance.trim();
    if (!/^\d+$/.test(idInstance) || !apiTokenInstance) {
      throw new Error('Укажите числовой idInstance и apiTokenInstance.');
    }
    let url: URL;
    try {
      url = new URL(credentials.apiUrl.trim());
    } catch {
      throw new Error('Укажите корректный apiUrl из личного кабинета.');
    }
    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.green-api.com') ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !['/', '/v3', '/v3/'].includes(url.pathname)
    ) {
      throw new Error(
        'apiUrl должен быть HTTPS-адресом сервера GREEN-API из личного кабинета.',
      );
    }
    this.credentials = {
      idInstance,
      apiTokenInstance,
      apiUrl: url.href.replace(/\/$/, ''),
    };
  }

  private async request(
    method: string,
    action: string,
    signal: AbortSignal,
    body?: unknown,
    suffix = '',
  ): Promise<unknown> {
    const { apiUrl, idInstance, apiTokenInstance } = this.credentials;
    const url = `${apiUrl}/waInstance${idInstance}/${action}/${encodeURIComponent(apiTokenInstance)}${suffix}`;
    const timeout = AbortSignal.timeout(25_000);
    try {
      const response = await fetch(url, {
        method,
        signal: AbortSignal.any([signal, timeout]),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        ...(body === undefined
          ? {}
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
      });
      const text = await response.text();
      let data: unknown = null;
      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          if (response.ok)
            throw new ApiError('Сервер вернул некорректный JSON.');
          data = text;
        }
      }
      if (!response.ok) {
        const detail = isRecord(data)
          ? (data.message ?? data.error ?? data.reason ?? text)
          : data;
        const safeDetail = String(detail ?? response.statusText)
          .replaceAll(apiTokenInstance, '[скрыто]')
          .replaceAll(encodeURIComponent(apiTokenInstance), '[скрыто]')
          .slice(0, 350);
        throw new ApiError(
          `GREEN-API: HTTP ${response.status}. ${safeDetail}`,
          response.status,
        );
      }
      return data;
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      if (error instanceof ApiError) throw error;
      if (timeout.aborted)
        throw new ApiError(
          'Сервер не ответил за 25 секунд. Проверьте соединение.',
        );
      throw new ApiError(
        'Не удалось связаться с GREEN-API. Проверьте сеть и apiUrl.',
      );
    }
  }

  async connect(signal: AbortSignal): Promise<void> {
    const state = await this.request('GET', 'getStateInstance', signal);
    if (!isRecord(state) || state.stateInstance !== 'authorized') {
      throw new ApiError(
        'Авторизуйте MAX-инстанс в личном кабинете GREEN-API и повторите вход.',
      );
    }
    const settings = await this.request('GET', 'getSettings', signal);
    if (!isRecord(settings) || settings.typeInstance !== 'v3') {
      throw new ApiError(
        'Для этого чата нужен инстанс MAX (v3), а не WhatsApp или Telegram.',
      );
    }
    if (settings.webhookUrl !== '' || settings.incomingWebhook !== 'yes') {
      throw new ApiError(
        'В настройках инстанса очистите webhookUrl и включите «Получать уведомления о входящих сообщениях и файлах». Подождите минуту и повторите вход.',
      );
    }
  }

  async checkAccount(phone: string, signal: AbortSignal): Promise<string> {
    const data = await this.request('POST', 'checkAccount', signal, {
      phoneNumber: Number(normalizePhone(phone)),
    });
    if (isRecord(data) && data.status === false) {
      throw new ApiError(
        'MAX не смог проверить номер. Проверьте авторизацию и лимиты инстанса.',
      );
    }
    if (
      !isRecord(data) ||
      data.exist !== true ||
      typeof data.chatId !== 'string' ||
      !/^\d+$/.test(data.chatId)
    ) {
      throw new ApiError(
        'Аккаунт MAX по этому номеру не найден. Проверьте номер и доступность поиска получателя.',
      );
    }
    return data.chatId;
  }

  async sendMessage(
    chatId: string,
    message: string,
    signal: AbortSignal,
  ): Promise<string> {
    if (!chatId || !message.trim() || message.length > 4000) {
      throw new Error('Укажите чат и сообщение длиной от 1 до 4000 символов.');
    }
    const data = await this.request('POST', 'sendMessage', signal, {
      chatId,
      message,
    });
    if (
      !isRecord(data) ||
      typeof data.idMessage !== 'string' ||
      !data.idMessage
    ) {
      throw new ApiError(
        'Сервер не вернул idMessage. Проверьте доставку перед повторной отправкой.',
      );
    }
    return data.idMessage;
  }

  async receiveNotification(signal: AbortSignal): Promise<Notification | null> {
    const data = await this.request(
      'GET',
      'receiveNotification',
      signal,
      undefined,
      '?receiveTimeout=10',
    );
    if (data === null) return null;
    if (
      !isRecord(data) ||
      typeof data.receiptId !== 'number' ||
      !Number.isSafeInteger(data.receiptId) ||
      data.receiptId < 0 ||
      !isRecord(data.body)
    ) {
      throw new ApiError('Некорректный формат входящего уведомления.');
    }
    return { receiptId: data.receiptId, body: data.body };
  }

  async deleteNotification(
    receiptId: number,
    signal: AbortSignal,
  ): Promise<void> {
    const data = await this.request(
      'DELETE',
      'deleteNotification',
      signal,
      undefined,
      `/${receiptId}`,
    );
    if (!isRecord(data) || typeof data.result !== 'boolean') {
      throw new ApiError(
        'Не удалось подтвердить получение уведомления. Повторим автоматически.',
      );
    }
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить действие. Повторите попытку.';
}
