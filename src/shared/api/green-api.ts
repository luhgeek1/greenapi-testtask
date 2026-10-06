export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface ApiResponse {
  data: unknown;
  status: number;
}

export interface SendFileInput {
  phone: string;
  urlFile: string;
  fileName: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
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
    method: 'GET' | 'POST',
    action: string,
    signal: AbortSignal,
    body?: unknown,
  ): Promise<ApiResponse> {
    const { apiUrl, idInstance, apiTokenInstance } = this.credentials;
    const url = `${apiUrl}/waInstance${idInstance}/${action}/${encodeURIComponent(apiTokenInstance)}`;
    const timeout = AbortSignal.timeout(25_000);
    const transport = this.transport;
    try {
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
      return { data, status: response.status };
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

  getSettings(signal: AbortSignal): Promise<ApiResponse> {
    return this.request('GET', 'getSettings', signal);
  }

  getStateInstance(signal: AbortSignal): Promise<ApiResponse> {
    return this.request('GET', 'getStateInstance', signal);
  }

  private async resolvePhone(
    phone: string,
    signal: AbortSignal,
  ): Promise<string> {
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
    phone: string,
    message: string,
    signal: AbortSignal,
  ): Promise<ApiResponse> {
    if (!message.trim() || message.length > 4000)
      throw new Error('Введите сообщение длиной от 1 до 4000 символов.');
    const chatId = await this.resolvePhone(phone, signal);
    signal.throwIfAborted();
    return this.request('POST', 'sendMessage', signal, { chatId, message });
  }

  async sendFileByUrl(
    input: SendFileInput,
    signal: AbortSignal,
  ): Promise<ApiResponse> {
    const fileName = input.fileName.trim();
    if (!/^[^/\\]+\.[^./\\\s]+$/.test(fileName))
      throw new Error(
        'Укажите имя файла с расширением, например document.pdf.',
      );
    let url: URL;
    try {
      url = new URL(input.urlFile.trim());
    } catch {
      throw new Error('Укажите прямую HTTP(S)-ссылку на файл.');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error('Укажите прямую HTTP(S)-ссылку на файл.');
    const chatId = await this.resolvePhone(input.phone, signal);
    signal.throwIfAborted();
    return this.request('POST', 'sendFileByUrl', signal, {
      chatId,
      urlFile: input.urlFile.trim(),
      fileName,
    });
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить запрос.';
}
