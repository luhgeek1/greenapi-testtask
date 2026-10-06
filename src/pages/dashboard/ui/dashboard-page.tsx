import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useApiRequest } from '@/features/api-request';
import { ApiResponsePanel } from '@/widgets/api-response';
import { demoCredentials, type Credentials } from '@/shared/api';
import { Icon } from '@/shared/ui';
import './dashboard-page.css';

interface SentItem {
  id: number;
  text: string;
  phone: string;
  file: boolean;
  time: string;
}

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
  const [showToken, setShowToken] = useState(false);
  const [messagePhone, setMessagePhone] = useState(
    demo ? '+7 999 123-45-67' : '',
  );
  const [message, setMessage] = useState(
    demo ? 'Привет! Проверяю GREEN-API.' : '',
  );
  const [filePhone, setFilePhone] = useState(demo ? '+375 29 123-45-67' : '');
  const [urlFile, setUrlFile] = useState(
    demo ? 'https://example.com/sample.pdf' : '',
  );
  const [fileName, setFileName] = useState(demo ? 'sample.pdf' : '');
  const [messages, setMessages] = useState<SentItem[]>([]);
  const sequence = useRef(0);
  const stream = useRef<HTMLDivElement>(null);
  const fileDialog = useRef<HTMLDialogElement>(null);
  const fileUrlInput = useRef<HTMLInputElement>(null);
  const { execute, pending, result, history, clear } = useApiRequest(demo);

  useEffect(() => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
  }, [messages]);

  function updateCredential(field: keyof Credentials, value: string) {
    setCredentials((current) => ({ ...current, [field]: value }));
  }

  function addSent(text: string, phone: string, file: boolean) {
    const time = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    const item = { id: ++sequence.current, text, phone, file, time };
    setMessages((current) => [...current, item]);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await execute(credentials, {
      method: 'sendMessage',
      phone: messagePhone,
      message,
    });
    if (response && !response.error) {
      addSent(message, messagePhone, false);
      setMessage('');
    }
  }

  async function sendFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await execute(credentials, {
      method: 'sendFileByUrl',
      phone: filePhone,
      urlFile,
      fileName,
    });
    if (response && !response.error) {
      addSent(fileName, filePhone, true);
      fileDialog.current?.close();
    }
  }

  function openFile() {
    if (messagePhone.trim()) setFilePhone(messagePhone);
    fileDialog.current?.showModal();
    fileUrlInput.current?.focus();
  }

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="dashboard-page">
      <aside className="client-sidebar" aria-label="Параметры инстанса">
        <div className="sidebar-content">
          <header className="sidebar-brand">
            <span
              className={`brand-dot ${pending ? 'is-working' : ''}`}
              aria-hidden="true"
            />
            <h1>MAX Client</h1>
          </header>
          <section
            className="connection-section"
            aria-labelledby="connection-title"
          >
            <h2
              id="connection-title"
              className="sidebar-heading"
              aria-label="GREEN-API Connection"
            >
              <Icon name="settings" />
              <span>Connection</span>
            </h2>
            <fieldset disabled={Boolean(pending)}>
              <div className="field">
                <label htmlFor="idInstance">idInstance</label>
                <input
                  id="idInstance"
                  name="idInstance"
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
                    name="apiTokenInstance"
                    type={showToken ? 'text' : 'password'}
                    required
                    autoComplete="off"
                    placeholder="apiTokenInstance"
                    value={credentials.apiTokenInstance}
                    onChange={(event) =>
                      updateCredential('apiTokenInstance', event.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((value) => !value)}
                    aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
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
                  name="apiUrl"
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
              disabled={Boolean(pending)}
            >
              {demo ? 'Перейти к реальному API' : 'Открыть демо'}
              <Icon name="arrow" />
            </button>
          </section>
          <section className="methods-section" aria-labelledby="methods-title">
            <h2 id="methods-title" className="sidebar-heading">
              Methods
            </h2>
            <button
              type="button"
              className="method-button settings-button"
              disabled={Boolean(pending)}
              onClick={() =>
                void execute(credentials, { method: 'getSettings' })
              }
            >
              {pending === 'getSettings' ? (
                <span className="spinner" />
              ) : (
                <Icon name="server" />
              )}
              <span>getSettings</span>
            </button>
            <button
              type="button"
              className="method-button state-button"
              disabled={Boolean(pending)}
              onClick={() =>
                void execute(credentials, { method: 'getStateInstance' })
              }
            >
              {pending === 'getStateInstance' ? (
                <span className="spinner" />
              ) : (
                <Icon name="server" />
              )}
              <span>getStateInstance</span>
            </button>
          </section>
          <footer className="sidebar-footer">
            <p>
              <Icon name="lock" />
              Токен — только в памяти вкладки
            </p>
          </footer>
        </div>
      </aside>
      <main className="client-main">
        <section className="chat-panel" aria-labelledby="message-title">
          <h2 id="message-title" className="sr-only">
            Send message
          </h2>
          <div className="chat-topbar">
            <div className="recipient-field">
              <label className="sr-only" htmlFor="message-phone">
                Номер телефона
              </label>
              <Icon name="phone" />
              <input
                id="message-phone"
                type="tel"
                required
                autoComplete="off"
                form="message-form"
                aria-label="Номер телефона"
                placeholder="79991234567"
                disabled={Boolean(pending)}
                value={messagePhone}
                onChange={(event) => setMessagePhone(event.target.value)}
              />
            </div>
            {demo && (
              <p className="demo-notice">
                Демо-режим <span>· без отправки в MAX</span>
              </p>
            )}
          </div>
          <div
            className="message-stream"
            ref={stream}
            role="log"
            aria-label="Отправленные сообщения"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="chat-empty">Тут пока ничего нет</div>
            ) : (
              messages.map((item) => (
                <div className="message-row" key={item.id}>
                  <article
                    className={`sent-bubble ${item.file ? 'file-bubble' : ''}`}
                  >
                    {item.file && <Icon name="file" />}
                    <div className="bubble-text">{item.text}</div>
                    <footer className="bubble-meta">
                      <span>{item.phone}</span>
                      <time>{item.time}</time>
                      <span
                        className="sent-state"
                        title={demo ? 'Демо-отправка' : 'Запрос принят API'}
                      >
                        <Icon name="check" />
                      </span>
                    </footer>
                  </article>
                </div>
              ))
            )}
          </div>
          <form
            id="message-form"
            className="message-form"
            onSubmit={(event) => void sendMessage(event)}
            aria-busy={pending === 'sendMessage'}
          >
            <div className="composer-field">
              <label className="sr-only" htmlFor="message">
                Сообщение
              </label>
              <Icon name="message" />
              <textarea
                id="message"
                required
                maxLength={4000}
                rows={1}
                placeholder="Сообщение…"
                disabled={Boolean(pending)}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={composerKeyDown}
              />
            </div>
            <button
              type="button"
              className="attachment-button"
              onClick={openFile}
              disabled={Boolean(pending)}
              aria-label="Отправить файл"
              title="Отправить файл"
            >
              <Icon name="attach" />
            </button>
            <button
              type="submit"
              className="send-button"
              disabled={Boolean(pending) || !message.trim()}
              aria-label="sendMessage"
              title="Отправить сообщение"
            >
              {pending === 'sendMessage' ? (
                <span className="spinner" />
              ) : (
                <Icon name="send" />
              )}
            </button>
          </form>
        </section>
        <ApiResponsePanel
          result={result}
          history={history}
          pending={pending}
          onClear={clear}
        />
      </main>
      <dialog
        className="file-dialog"
        ref={fileDialog}
        aria-labelledby="file-title"
      >
        <header className="file-dialog-header">
          <div>
            <h2 id="file-title">Send file</h2>
            <p>Отправить файл по прямой ссылке</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => fileDialog.current?.close()}
            aria-label="Закрыть форму файла"
          >
            <Icon name="close" />
          </button>
        </header>
        <form
          onSubmit={(event) => void sendFile(event)}
          aria-busy={pending === 'sendFileByUrl'}
        >
          <fieldset disabled={Boolean(pending)}>
            <div className="field">
              <label htmlFor="file-phone">Номер телефона</label>
              <input
                id="file-phone"
                type="tel"
                required
                autoComplete="off"
                placeholder="+7 999 123-45-67"
                value={filePhone}
                onChange={(event) => setFilePhone(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="urlFile">URL файла</label>
              <input
                id="urlFile"
                ref={fileUrlInput}
                type="url"
                required
                autoComplete="off"
                placeholder="https://example.com/document.pdf"
                value={urlFile}
                onChange={(event) => setUrlFile(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="fileName">Имя файла</label>
              <input
                id="fileName"
                required
                autoComplete="off"
                placeholder="document.pdf"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
              />
            </div>
            <button type="submit" className="primary-button">
              {pending === 'sendFileByUrl' ? (
                <span className="spinner" />
              ) : (
                <Icon name="file" />
              )}
              sendFileByUrl
            </button>
            {result?.method === 'sendFileByUrl' && result.error && (
              <p className="response-error" role="alert">
                {result.error}
              </p>
            )}
          </fieldset>
        </form>
      </dialog>
    </div>
  );
}
