import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  errorMessage,
  normalizePhone,
  type GreenApiClient,
} from '../api/greenApi';
import { addMessage, parseIncoming, type Chat } from '../chat/model';
import { pollNotifications } from '../chat/pollNotifications';
import { Brand, Icon } from './Icon';
import { MessageComposer } from './MessageComposer';

const time = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
const day = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export function ChatApp({
  client,
  instanceId,
  onLogout,
}: {
  client: GreenApiClient;
  instanceId: string;
  onLogout: () => void;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(true);
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [receiveError, setReceiveError] = useState('');
  const [stopped, setStopped] = useState(false);
  const [retry, setRetry] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const activeRef = useRef<string | null>(null);
  const session = useRef<AbortController | null>(null);
  const creatingRef = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const newChatInput = useRef<HTMLInputElement>(null);
  const active = chats.find((chat) => chat.id === activeId);

  useEffect(() => {
    const controller = new AbortController();
    session.current = controller;
    return () => controller.abort();
  }, [client]);

  useEffect(() => {
    const controller = new AbortController();
    void pollNotifications(
      client,
      controller.signal,
      ({ body }) => {
        const incoming = parseIncoming(body);
        if (!incoming) return;
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
                  { ...chat, title: incoming.name },
                  incoming.message,
                  activeRef.current === chat.id,
                )
              : chat,
          );
        });
      },
      (error, paused) => {
        setReceiveError(error ? errorMessage(error) : '');
        setStopped(paused);
      },
    );
    return () => controller.abort();
  }, [client, retry]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [activeId, active?.messages.length]);
  useEffect(() => {
    if (showNewChat) newChatInput.current?.focus();
  }, [showNewChat]);

  function selectChat(id: string) {
    activeRef.current = id;
    setActiveId(id);
    setChats((current) =>
      current.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat)),
    );
  }

  async function createChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingRef.current || !session.current) return;
    const signal = session.current.signal;
    creatingRef.current = true;
    setCreating(true);
    setCreateError('');
    try {
      const normalized = normalizePhone(phone);
      const existing = chats.find((chat) => chat.phone === normalized);
      const id =
        existing?.id ?? (await client.checkAccount(normalized, signal));
      if (signal.aborted) return;
      setChats((current) =>
        current.some((chat) => chat.id === id)
          ? current
          : [
              ...current,
              {
                id,
                title: `+${normalized}`,
                phone: normalized,
                unread: 0,
                messages: [],
              },
            ],
      );
      selectChat(id);
      setPhone('');
      setShowNewChat(false);
    } catch (cause) {
      if (!signal.aborted) setCreateError(errorMessage(cause));
    } finally {
      creatingRef.current = false;
      if (!signal.aborted) setCreating(false);
    }
  }

  async function sendMessage(chatId: string, text: string) {
    const signal = session.current?.signal;
    if (!signal || signal.aborted)
      throw new Error('Подключение закрыто. Войдите заново.');
    if (pending.current.has(chatId)) return;
    pending.current.add(chatId);
    setPendingIds((current) => [...current, chatId]);
    try {
      const id = await client.sendMessage(chatId, text, signal);
      if (signal.aborted) return;
      setChats((current) =>
        current.map((chat) =>
          chat.id === chatId
            ? addMessage(
                chat,
                {
                  id,
                  text,
                  timestamp: Math.floor(Date.now() / 1000) * 1000,
                  direction: 'outgoing',
                },
                activeRef.current === chatId,
              )
            : chat,
        ),
      );
      setDrafts((current) => ({ ...current, [chatId]: '' }));
    } finally {
      pending.current.delete(chatId);
      if (!signal.aborted)
        setPendingIds((current) => current.filter((id) => id !== chatId));
    }
  }

  function logout() {
    session.current?.abort();
    onLogout();
  }

  return (
    <main className="chat-page">
      {receiveError && (
        <div className="receive-error" role="alert">
          <span>
            {receiveError}{' '}
            {stopped
              ? 'Получение сообщений остановлено.'
              : 'Повторяем подключение…'}
          </span>
          {stopped && (
            <button
              type="button"
              onClick={() => {
                setStopped(false);
                setRetry((value) => value + 1);
              }}
            >
              Повторить
            </button>
          )}
        </div>
      )}
      <div className={`chat-shell ${active ? 'has-active-chat' : ''}`}>
        <aside className="sidebar" aria-label="Список чатов">
          <div className="sidebar-brand">
            <Brand />
          </div>
          <div className="sidebar-heading">
            <h1>Чаты</h1>
            <button
              type="button"
              className="icon-button new-chat-button"
              aria-label="Новый чат"
              aria-expanded={showNewChat}
              onClick={() => setShowNewChat(!showNewChat)}
            >
              <Icon name="plus" />
            </button>
          </div>
          {showNewChat && (
            <form
              className="new-chat-form"
              onSubmit={createChat}
              aria-busy={creating}
            >
              <label htmlFor="phone">Номер телефона</label>
              <input
                ref={newChatInput}
                id="phone"
                type="tel"
                required
                placeholder="+7 999 123-45-67"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={creating}
                autoComplete="off"
              />
              <p className="field-hint">Международный формат: +7 или +375</p>
              {createError && (
                <p className="error-box" role="alert">
                  {createError}
                </p>
              )}
              <button
                className="primary-button"
                type="submit"
                disabled={creating}
              >
                {creating ? 'Ищем получателя…' : 'Создать чат'}
              </button>
            </form>
          )}
          <nav className="chat-list" aria-label="Чаты">
            {chats.length === 0 ? (
              <div className="no-chats">
                <Icon name="chat" />
                <p>Пока нет чатов</p>
                <span>
                  Добавьте номер получателя,
                  <br />
                  чтобы начать общение.
                </span>
              </div>
            ) : (
              chats.map((chat) => {
                const last = chat.messages.at(-1);
                return (
                  <button
                    type="button"
                    key={chat.id}
                    className={`chat-item ${chat.id === activeId ? 'selected' : ''}`}
                    aria-pressed={chat.id === activeId}
                    onClick={() => selectChat(chat.id)}
                  >
                    <span className="avatar" aria-hidden="true">
                      {chat.title.startsWith('+') ? (
                        <Icon name="chat" />
                      ) : (
                        chat.title.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="chat-item-content">
                      <span className="chat-item-title">{chat.title}</span>
                      <span className="chat-preview">
                        {last
                          ? `${last.direction === 'outgoing' ? 'Вы: ' : ''}${last.text}`
                          : 'Начните переписку'}
                      </span>
                    </span>
                    <span className="chat-item-meta">
                      {last && (
                        <time dateTime={new Date(last.timestamp).toISOString()}>
                          {time(last.timestamp)}
                        </time>
                      )}
                      {chat.unread > 0 && (
                        <span
                          className="unread-count"
                          aria-label={`${chat.unread} непрочитанных`}
                        >
                          {chat.unread}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </nav>
          <div className="account-footer">
            <span
              className={`account-dot ${receiveError ? 'connection-warning' : ''}`}
            />
            <span>
              <strong>
                {stopped
                  ? 'Получение остановлено'
                  : receiveError
                    ? 'Восстанавливаем связь'
                    : 'MAX подключён'}
              </strong>
              <small>Инстанс {instanceId}</small>
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Выйти из чата"
              onClick={logout}
            >
              <Icon name="logout" />
            </button>
          </div>
        </aside>
        <section className="conversation" aria-label="Переписка">
          {active ? (
            <>
              <header className="conversation-header">
                <button
                  className="icon-button mobile-back"
                  type="button"
                  aria-label="Вернуться к чатам"
                  onClick={() => {
                    activeRef.current = null;
                    setActiveId(null);
                  }}
                >
                  <Icon name="back" />
                </button>
                <span className="avatar" aria-hidden="true">
                  {active.title.startsWith('+') ? (
                    <Icon name="chat" />
                  ) : (
                    active.title.charAt(0).toUpperCase()
                  )}
                </span>
                <div>
                  <h2>{active.title}</h2>
                  <p>
                    {active.phone && !active.title.startsWith('+')
                      ? `+${active.phone} · `
                      : ''}
                    MAX · текстовые сообщения
                  </p>
                </div>
              </header>
              <div
                className="messages"
                role="log"
                aria-label="Сообщения в чате"
                aria-live="polite"
                aria-relevant="additions"
              >
                {active.messages.length === 0 && (
                  <div className="chat-start-note">
                    <Icon name="chat" />
                    <p>Начните разговор</p>
                    <span>Отправьте первое сообщение получателю.</span>
                  </div>
                )}
                {active.messages.map((message, index) => (
                  <div key={`${message.direction}-${message.id}`}>
                    {(index === 0 ||
                      day(active.messages[index - 1].timestamp) !==
                        day(message.timestamp)) && (
                      <div className="date-divider">
                        {day(message.timestamp)}
                      </div>
                    )}
                    <div className={`message-row ${message.direction}`}>
                      <div className="message-bubble">
                        <p>{message.text}</p>
                        <div className="message-meta">
                          <time
                            dateTime={new Date(message.timestamp).toISOString()}
                          >
                            {time(message.timestamp)}
                          </time>
                          {message.direction === 'outgoing' && (
                            <span
                              title="Принято API в очередь отправки"
                              aria-label="Принято API в очередь отправки"
                            >
                              <Icon name="check" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <MessageComposer
                key={active.id}
                text={drafts[active.id] ?? ''}
                onTextChange={(text) =>
                  setDrafts((current) => ({ ...current, [active.id]: text }))
                }
                busy={pendingIds.includes(active.id)}
                onSend={(text) => sendMessage(active.id, text)}
              />
            </>
          ) : (
            <div className="empty-conversation">
              <div className="empty-chat-icon">
                <Icon name="chat" />
              </div>
              <h2>Ваши сообщения — здесь</h2>
              <p>
                Создайте чат по номеру телефона
                <br />
                или выберите переписку слева.
              </p>
              <span className="text-only-badge">Только текст. Всё просто.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
