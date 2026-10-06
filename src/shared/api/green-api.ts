export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface ApiResponse {
  data: unknown;
  status: number;
}

export interface Notification {
  receiptId: number;
  body: unknown;
}

export type ApiMethod =
  | 'getSettings'
  | 'getStateInstance'
  | 'checkAccount'
  | 'sendMessage'
  | 'receiveNotification'
  | 'deleteNotification';

export interface ApiEvent {
  method: ApiMethod;
  data: unknown;
  status?: number;
  duration: number;
  error: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: unknown,
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
    throw new Error('Укажите номер РФ (+7) или Беларуси (+375) для MAX.');
  }
  return digits;
}

function redact(value: unknown, token: string): unknown {
  const hide = (text: string) =>
    text
      .replaceAll(token, '[скрыто]')
      .replaceAll(encodeURIComponent(token), '[скрыто]');
  if (typeof value === 'string') return hide(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, token));
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        hide(key),
        redact(item, token),
      ]),
    );
  return value;
}

export class GreenApiClient {
  private readonly credentials: Credentials;

  constructor(
    credentials: Credentials,
    private readonly transport: typeof fetch = fetch,
    private readonly onResponse?: (event: ApiEvent) => void,
  ) {
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
    method: 'GET' | 'POST' | 'DELETE',
    action: ApiMethod,
    signal: AbortSignal,
    body?: unknown,
    suffix = '',
  ): Promise<ApiResponse> {
    const { apiUrl, idInstance, apiTokenInstance } = this.credentials;
    const url = `${apiUrl}/waInstance${idInstance}/${action}/${encodeURIComponent(apiTokenInstance)}${suffix}`;
    const started = performance.now();
    const timeout = AbortSignal.timeout(25_000);
    const transport = this.transport;
    try {
      signal.throwIfAborted();
      const response = await transport(url, {
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
      signal.throwIfAborted();
      let data: unknown = null;
      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          if (response.ok)
            throw new ApiError(
              'Сервер вернул некорректный JSON.',
              response.status,
              redact(text, apiTokenInstance),
            );
          data = text;
        }
      }
      data = redact(data, apiTokenInstance);
      if (!response.ok) {
        const detail = isRecord(data)
          ? (data.message ?? data.error ?? data.reason)
          : data;
        throw new ApiError(
          `GREEN-API: HTTP ${response.status}. ${String(detail ?? response.statusText).slice(0, 350)}`,
          response.status,
          data,
        );
      }
      if (
        !signal.aborted &&
        !(action === 'receiveNotification' && data === null)
      ) {
        this.onResponse?.({
          method: action,
          data,
          status: response.status,
          duration: performance.now() - started,
          error: '',
        });
      }
      return { data, status: response.status };
    } catch (cause) {
      if (signal.aborted) throw signal.reason;
      const error =
        cause instanceof ApiError
          ? cause
          : timeout.aborted
            ? new ApiError(
                'Сервер не ответил за 25 секунд. Проверьте соединение.',
              )
            : new ApiError(
                'Не удалось связаться с GREEN-API. Проверьте сеть и apiUrl.',
              );
      this.onResponse?.({
        method: action,
        data: error.data ?? { error: error.message },
        status: error.status,
        duration: performance.now() - started,
        error: error.message,
      });
      throw error;
    }
  }

  getSettings(signal: AbortSignal): Promise<ApiResponse> {
    return this.request('GET', 'getSettings', signal);
  }

  getStateInstance(signal: AbortSignal): Promise<ApiResponse> {
    return this.request('GET', 'getStateInstance', signal);
  }

  async connect(signal: AbortSignal): Promise<void> {
    const { data: state } = await this.getStateInstance(signal);
    signal.throwIfAborted();
    if (!isRecord(state) || state.stateInstance !== 'authorized') {
      throw new ApiError(
        'Авторизуйте MAX-инстанс в личном кабинете GREEN-API и повторите подключение.',
      );
    }
    const { data: settings } = await this.getSettings(signal);
    signal.throwIfAborted();
    if (!isRecord(settings) || settings.typeInstance !== 'v3') {
      throw new ApiError('Для этого чата нужен инстанс MAX (v3).');
    }
    if (settings.webhookUrl !== '' || settings.incomingWebhook !== 'yes') {
      throw new ApiError(
        'В настройках инстанса очистите webhookUrl и включите уведомления о входящих сообщениях и файлах. Подождите минуту и подключитесь снова.',
      );
    }
  }

  async checkAccount(phone: string, signal: AbortSignal): Promise<string> {
    const { data } = await this.request('POST', 'checkAccount', signal, {
      phoneNumber: Number(normalizePhone(phone)),
    });
    if (isRecord(data) && data.status === false) {
      throw new ApiError(
        'MAX не смог проверить номер. Проверьте авторизацию и лимиты инстанса.',
        undefined,
        data,
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
        undefined,
        data,
      );
    }
    return data.chatId;
  }

  async sendMessage(
    chatId: string,
    message: string,
    signal: AbortSignal,
  ): Promise<string> {
    if (!/^\d+$/.test(chatId) || !message.trim() || message.length > 4000)
      throw new Error('Введите сообщение длиной от 1 до 4000 символов.');
    signal.throwIfAborted();
    const { data } = await this.request('POST', 'sendMessage', signal, {
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
    const { data } = await this.request(
      'GET',
      'receiveNotification',
      signal,
      undefined,
      '?receiveTimeout=10',
    );
    if (data === null) return null;
    if (
      !isRecord(data) ||
      !Number.isSafeInteger(data.receiptId) ||
      (data.receiptId as number) < 0 ||
      !isRecord(data.body)
    ) {
      throw new ApiError('Некорректный формат входящего уведомления.');
    }
    return { receiptId: data.receiptId as number, body: data.body };
  }

  async deleteNotification(
    receiptId: number,
    signal: AbortSignal,
  ): Promise<void> {
    if (!Number.isSafeInteger(receiptId) || receiptId < 0)
      throw new Error('Некорректный receiptId.');
    const { data } = await this.request(
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
    : 'Не удалось выполнить запрос.';
}
