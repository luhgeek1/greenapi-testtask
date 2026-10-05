import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorMessage, GreenApiClient } from '../api/greenApi';
import { Brand, Icon } from './Icon';

export function LoginForm({
  onConnect,
}: {
  onConnect: (client: GreenApiClient, id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const data = new FormData(event.currentTarget);
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const id = String(data.get('idInstance')).trim();
      const client = new GreenApiClient({
        idInstance: id,
        apiTokenInstance: String(data.get('apiTokenInstance')),
        apiUrl: String(data.get('apiUrl')),
      });
      await client.connect(controller.signal);
      if (!controller.signal.aborted) onConnect(client, id);
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <div className="login-heading">
          <h1>Войдите в чат</h1>
          <p>Подключите свой инстанс и общайтесь в MAX.</p>
        </div>
        <form onSubmit={connect} autoComplete="off" aria-busy={busy}>
          <fieldset disabled={busy}>
            <label htmlFor="idInstance">idInstance</label>
            <input
              id="idInstance"
              name="idInstance"
              inputMode="numeric"
              pattern="[0-9]+"
              required
              placeholder="ID инстанса"
              autoComplete="off"
            />
            <label htmlFor="apiTokenInstance">apiTokenInstance</label>
            <input
              id="apiTokenInstance"
              name="apiTokenInstance"
              type="password"
              required
              placeholder="Ключ доступа инстанса"
              autoComplete="off"
            />
            <label htmlFor="apiUrl">apiUrl</label>
            <input
              id="apiUrl"
              name="apiUrl"
              type="url"
              placeholder="https://3100.api.green-api.com"
              required
              autoComplete="off"
              aria-describedby="api-help"
            />
            <p className="field-hint" id="api-help">
              Все три значения доступны в{' '}
              <a
                href="https://console.green-api.com/"
                target="_blank"
                rel="noreferrer"
              >
                личном кабинете GREEN-API
              </a>
              .
            </p>
            {error && (
              <p className="error-box" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button login-button" type="submit">
              {busy ? (
                <>
                  <span className="spinner" />
                  Подключаемся…
                </>
              ) : (
                <>
                  Войти в чат
                  <Icon name="chat" />
                </>
              )}
            </button>
          </fieldset>
        </form>
        <p className="privacy-note">
          Ключ доступа хранится только в памяти этой вкладки.
        </p>
        <details className="setup-help">
          <summary>Как подготовить инстанс?</summary>
          <p>
            Создайте инстанс MAX и авторизуйте его в личном кабинете. В
            настройках очистите webhookUrl и включите получение уведомлений о
            входящих сообщениях. После изменения настроек подождите минуту.
          </p>
        </details>
      </div>
      <p className="login-footer">Текстовые сообщения · GREEN-API для MAX</p>
    </main>
  );
}
