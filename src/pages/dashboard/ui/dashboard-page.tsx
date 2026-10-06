import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useApiLog } from '@/features/api-log';
import { ApiResponsePanel } from '@/widgets/api-response';
import {
  GreenApiClient,
  createDemoTransport,
  demoCredentials,
  errorMessage,
  type ApiMethod,
  type Credentials,
} from '@/shared/api';
import { formatDay, formatTime } from '@/entities/chat';
import { Icon } from '@/shared/ui';
import { useChatWorkspace } from '../model/use-chat-workspace';
import './dashboard-page.css';

export function DashboardPage({
  demo,
  onModeChange,
}: {
  demo: boolean;
  onModeChange: () => void;
}) {
  const [credentials, setCredentials] = useState<Credentials>(() =>
    demo
      ? { ...demoCredentials }
      : { idInstance: '', apiTokenInstance: '', apiUrl: '' },
  );
  const [transport] = useState(() =>
    demo ? createDemoTransport() : undefined,
  );
  const [client, setClient] = useState<GreenApiClient | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [pending, setPending] = useState<ApiMethod | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [search, setSearch] = useState('');
  const action = useRef<AbortController | null>(null);
  const stream = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const { record, history, result, clear } = useApiLog();
  const workspace = useChatWorkspace(client, demo);
  const { active, createChat, receiving } = workspace;
  const lastMessage = active?.messages.at(-1);
  const chats = [...workspace.chats]
    .sort(
      (a, b) =>
        (b.messages.at(-1)?.timestamp ?? 0) -
        (a.messages.at(-1)?.timestamp ?? 0),
    )
    .filter((chat) =>
      `${chat.title} ${chat.phone ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    );
  const unread = workspace.chats.reduce((sum, chat) => sum + chat.unread, 0);

  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
  }, [active?.id, lastMessage?.id]);
  useEffect(() => {
    if (client && workspace.showNewChat) phoneInput.current?.focus();
    else if (active) composer.current?.focus();
  }, [client, workspace.showNewChat, active?.id]);

  useEffect(() => {
    const input = composer.current;
    if (!input) return;
    input.style.height = '44px';
    input.style.height = `${Math.min(132, input.scrollHeight)}px`;
  }, [workspace.draft, active?.id, workspace.showNewChat]);

  function updateCredential(field: keyof Credentials, value: string) {
    setCredentials((current) => ({ ...current, [field]: value }));
    setConnectionError('');
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action.current) return;
    const controller = new AbortController();
    action.current = controller;
    setConnecting(true);
    setConnectionError('');
    try {
      const next = new GreenApiClient(credentials, transport, record);
      await next.connect(controller.signal);
      if (!controller.signal.aborted) setClient(next);
    } catch (cause) {
      if (!controller.signal.aborted) setConnectionError(errorMessage(cause));
    } finally {
      if (action.current === controller) action.current = null;
      if (!controller.signal.aborted) setConnecting(false);
    }
  }

  function disconnect() {
    action.current?.abort();
    action.current = null;
    setPending(null);
    setConnecting(false);
    setClient(null);
    setShowToken(false);
    setSearch('');
    clear();
    if (!demo)
      setCredentials((current) => ({ ...current, apiTokenInstance: '' }));
  }

  async function diagnose(method: 'getSettings' | 'getStateInstance') {
    if (action.current) return;
    const controller = new AbortController();
    action.current = controller;
    setPending(method);
    setConnectionError('');
    try {
      await (client ?? new GreenApiClient(credentials, transport, record))[
        method
      ](controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted) setConnectionError(errorMessage(cause));
    } finally {
      if (action.current === controller) action.current = null;
      if (!controller.signal.aborted) setPending(null);
    }
  }

  function newChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createChat.onCreate();
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void workspace.sendMessage(workspace.draft);
  }

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (!workspace.busy && workspace.draft.trim())
        event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className={`dashboard-page ${client ? 'is-connected' : ''}`}>
      <aside className="client-sidebar" aria-label="Подключение и чаты">
        <div className="sidebar-content">
          <header className="sidebar-brand">
            <span
              className={`brand-dot ${connecting ? 'is-working' : ''}`}
              aria-hidden="true"
            />
            <h1>MAX Client</h1>
            {demo && <span className="demo-badge">DEMO</span>}
          </header>
          <section
            className="connection-section"
            aria-label="GREEN-API Connection"
          >
            <details className="connection-details" open={!client}>
              <summary className="sidebar-heading">
                <Icon name="settings" />
                <span>Connection</span>
                <span className="connection-chevron">›</span>
              </summary>
              <form onSubmit={(event) => void connect(event)}>
                <fieldset
                  disabled={connecting || Boolean(pending) || Boolean(client)}
                >
                  <div className="field">
                    <label htmlFor="idInstance">idInstance</label>
                    <input
                      id="idInstance"
                      inputMode="numeric"
                      pattern="[0-9]+"
                      required
                      autoComplete="off"
                      placeholder="idInstance"
                      value={credentials.idInstance}
                      onChange={(event) =>
                        updateCredential('idInstance', event.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="apiTokenInstance">apiTokenInstance</label>
                    <div className="token-field">
                      <input
                        id="apiTokenInstance"
                        type={showToken ? 'text' : 'password'}
                        required
                        autoComplete="off"
                        placeholder="apiTokenInstance"
                        value={credentials.apiTokenInstance}
                        onChange={(event) =>
                          updateCredential(
                            'apiTokenInstance',
                            event.target.value,
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((value) => !value)}
                        aria-label={
                          showToken ? 'Скрыть токен' : 'Показать токен'
                        }
                        aria-pressed={showToken}
                      >
                        <Icon name={showToken ? 'eyeOff' : 'eye'} />
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="apiUrl">apiUrl</label>
                    <input
                      id="apiUrl"
                      type="url"
                      required
                      autoComplete="off"
                      placeholder="https://3100.api.green-api.com"
                      value={credentials.apiUrl}
                      onChange={(event) =>
                        updateCredential('apiUrl', event.target.value)
                      }
                    />
                  </div>
                </fieldset>
                <button
                  type="button"
                  className="mode-switch"
                  onClick={onModeChange}
                  disabled={connecting || Boolean(pending)}
                >
                  {demo ? 'Перейти к реальному API' : 'Открыть демо'}
                  <Icon name="arrow" />
                </button>
                {!client && (
                  <button
                    className="primary-button connect-button"
                    disabled={connecting || Boolean(pending)}
                  >
                    {connecting ? (
                      <span className="spinner" />
                    ) : (
                      <Icon name="connection" />
                    )}
                    {connecting ? 'Подключаемся…' : 'Подключиться'}
                  </button>
                )}
              </form>
            </details>
            {client && (
              <div className="session-summary">
                <span className="session-status">
                  <i />
                  Инстанс {credentials.idInstance}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={disconnect}
                  aria-label="Отключиться"
                  title="Отключиться"
                >
                  <Icon name="logout" />
                </button>
              </div>
            )}
            {connectionError && (
              <p className="connection-error" role="alert">
                {connectionError}
              </p>
            )}
          </section>
          <section className="chats-section" aria-labelledby="chats-title">
            <div className="chats-heading">
              <h2 id="chats-title">
                Чаты
                {unread > 0 && (
                  <span
                    className="total-unread"
                    aria-label={`${unread} непрочитанных`}
                  >
                    {unread}
                  </span>
                )}
              </h2>
              <button
                type="button"
                className="new-chat-button"
                aria-label="Новый чат"
                title="Новый чат"
                disabled={!client}
                onClick={() => {
                  workspace.openNewChat();
                }}
              >
                <Icon name="plus" />
              </button>
            </div>
            <div className="chat-search">
              <Icon name="search" />
              <input
                aria-label="Поиск чатов"
                placeholder="Найти"
                value={search}
                disabled={!client}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <nav className="chat-list" aria-label="Список чатов">
              {chats.map((chat) => {
                const preview = chat.messages.at(-1);
                return (
                  <button
                    type="button"
                    className={`chat-list-item ${active?.id === chat.id && !workspace.showNewChat ? 'is-active' : ''}`}
                    key={chat.id}
                    aria-label={`Чат ${chat.title}`}
                    aria-current={
                      active?.id === chat.id && !workspace.showNewChat
                        ? 'page'
                        : undefined
                    }
                    onClick={() => {
                      workspace.selectChat(chat.id);
                    }}
                  >
                    <span
                      className={`chat-avatar ${[...chat.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0 ? 'avatar-violet' : ''}`}
                    >
                      {chat.title.startsWith('+') ? (
                        <Icon name="phone" />
                      ) : (
                        chat.title[0]
                      )}
                    </span>
                    <span className="chat-list-copy">
                      <span className="chat-list-title">{chat.title}</span>
                      <span className="chat-preview">
                        {preview?.direction === 'outgoing' ? 'Вы: ' : ''}
                        {preview?.text || 'Начните переписку'}
                      </span>
                    </span>
                    <span className="chat-list-meta">
                      {preview && <time>{formatTime(preview.timestamp)}</time>}
                      {chat.unread > 0 && (
                        <span
                          className="unread-badge"
                          aria-label={`${chat.unread} непрочитанных`}
                        >
                          {chat.unread}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              {chats.length === 0 && (
                <p className="chat-list-empty">
                  {search
                    ? 'Ничего не найдено'
                    : client
                      ? 'Создайте чат по номеру телефона или дождитесь входящего сообщения.'
                      : 'Подключите инстанс, чтобы начать переписку.'}
                </p>
              )}
            </nav>
          </section>
          <footer className="sidebar-footer">
            <details className="api-diagnostics">
              <summary>
                <Icon name="code" />
                Диагностика API<span>›</span>
              </summary>
              <button
                type="button"
                className="method-button settings-button"
                disabled={connecting || Boolean(pending)}
                onClick={() => void diagnose('getSettings')}
              >
                <Icon name="server" />
                getSettings
              </button>
              <button
                type="button"
                className="method-button state-button"
                disabled={connecting || Boolean(pending)}
                onClick={() => void diagnose('getStateInstance')}
              >
                <Icon name="server" />
                getStateInstance
              </button>
            </details>
            <p>
              <Icon name="lock" />
              Токен хранится только в этой вкладке
            </p>
          </footer>
        </div>
      </aside>
      <main className="client-main">
        <section className="chat-panel" aria-label="Переписка">
          <header className="chat-topbar">
            <div className="chat-topbar-left">
              <Icon name="chat" />
              <span>MAX Messenger</span>
            </div>
            <div className="contact-pill">
              <Icon
                name={active && !workspace.showNewChat ? 'phone' : 'chat'}
              />
              <span>
                {active && !workspace.showNewChat
                  ? active.title
                  : 'Новый разговор'}
              </span>
            </div>
            <span
              className={`connection-indicator ${client && !receiving.error ? 'online' : ''}`}
              role="status"
            >
              <i />
              {!client
                ? 'Не подключено'
                : receiving.stopped
                  ? 'Получение остановлено'
                  : receiving.error
                    ? 'Переподключение…'
                    : demo
                      ? 'Демо · на связи'
                      : 'На связи'}
            </span>
          </header>
          {client && receiving.error && (
            <div className="receiving-notice" role="alert">
              <span>
                {receiving.stopped && 'Получение сообщений остановлено. '}
                {receiving.error}
                {!receiving.stopped && ' Повторяем автоматически.'}
              </span>
              <button type="button" onClick={receiving.onRetry}>
                Повторить
              </button>
            </div>
          )}
          {!client ? (
            <div className="chat-empty welcome-state">
              <span className="welcome-icon">
                <Icon name="chat" />
              </span>
              <h2>Ваши разговоры — здесь</h2>
              <p>
                Подключите GREEN-API инстанс
                <br />и начните переписку в MAX.
              </p>
              <span className="welcome-caption">
                {demo
                  ? 'Демо использует вымышленные данные и локальные ответы.'
                  : 'Номер получателя · текст · настоящий ответ'}
              </span>
            </div>
          ) : workspace.showNewChat || !active ? (
            <div className="chat-empty">
              <form className="new-chat-card" onSubmit={newChat}>
                <span className="welcome-icon">
                  <Icon name="message" />
                </span>
                <h2>Начните разговор</h2>
                <p>Введите номер получателя в MAX</p>
                <div className="recipient-field">
                  <Icon name="phone" />
                  <input
                    ref={phoneInput}
                    aria-label="Телефон получателя"
                    type="tel"
                    required
                    autoComplete="off"
                    placeholder="+7 999 123-45-67"
                    value={createChat.phone}
                    disabled={createChat.busy}
                    onChange={(event) =>
                      createChat.onPhoneChange(event.target.value)
                    }
                  />
                </div>
                <button className="primary-button" disabled={createChat.busy}>
                  {createChat.busy ? (
                    <span className="spinner" />
                  ) : (
                    <Icon name="arrow" />
                  )}
                  {createChat.busy ? 'Ищем получателя…' : 'Открыть чат'}
                </button>
                {createChat.error && (
                  <p className="connection-error" role="alert">
                    {createChat.error}
                  </p>
                )}
                <span className="welcome-caption">
                  {demo
                    ? 'Демонстрационные номера: +7 999 123-45-67 и +375 29 123-45-67'
                    : 'Поддерживаются номера РФ (+7) и Беларуси (+375)'}
                </span>
              </form>
            </div>
          ) : (
            <>
              <div
                className="message-stream"
                ref={stream}
                role="log"
                aria-label="Сообщения чата"
                aria-live="polite"
                aria-relevant="additions"
              >
                {active.messages.length === 0 && (
                  <div className="chat-empty">Тут пока ничего нет</div>
                )}
                {active.messages.map((item, index) => (
                  <div key={`${item.direction}-${item.id}`}>
                    {(index === 0 ||
                      formatDay(active.messages[index - 1].timestamp) !==
                        formatDay(item.timestamp)) && (
                      <div className="day-separator">
                        <span>{formatDay(item.timestamp)}</span>
                      </div>
                    )}
                    <div className={`message-row ${item.direction}`}>
                      <article
                        className={`sent-bubble ${item.direction === 'incoming' ? 'incoming-bubble' : ''}`}
                        aria-label={
                          item.direction === 'incoming'
                            ? 'Входящее сообщение'
                            : 'Исходящее сообщение'
                        }
                      >
                        <p className="bubble-text">{item.text}</p>
                        <div className="bubble-meta">
                          <time
                            dateTime={new Date(item.timestamp).toISOString()}
                          >
                            {formatTime(item.timestamp)}
                          </time>
                          {item.direction === 'outgoing' && (
                            <span
                              className="sent-state"
                              aria-label="Принято API"
                              title="Принято API"
                            >
                              <Icon name="check" />
                            </span>
                          )}
                        </div>
                      </article>
                    </div>
                  </div>
                ))}
              </div>
              {workspace.sendError && (
                <p className="send-error" role="alert">
                  {workspace.sendError}
                </p>
              )}
              <form
                className="message-form"
                onSubmit={sendMessage}
                aria-label="Отправка сообщения"
              >
                <div className="composer-field">
                  <Icon name="message" />
                  <textarea
                    ref={composer}
                    aria-label="Сообщение"
                    required
                    maxLength={4000}
                    rows={1}
                    placeholder="Написать сообщение…"
                    value={workspace.draft}
                    onChange={(event) =>
                      workspace.changeDraft(event.target.value)
                    }
                    onKeyDown={composerKeyDown}
                  />
                </div>
                <button
                  className="send-button"
                  disabled={workspace.busy || !workspace.draft.trim()}
                  aria-label="Отправить сообщение"
                  title="Отправить сообщение"
                >
                  {workspace.busy ? (
                    <span className="spinner" />
                  ) : (
                    <Icon name="send" />
                  )}
                </button>
              </form>
              <div className="composer-hint">
                Enter — отправить · Shift + Enter — новая строка
              </div>
            </>
          )}
        </section>
        <ApiResponsePanel
          result={result}
          history={history}
          pending={pending}
          onClear={clear}
        />
      </main>
    </div>
  );
}
