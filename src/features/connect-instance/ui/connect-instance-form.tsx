import type { FormEvent } from 'react';
import { Icon } from '@/shared/ui';
import {
  useConnectInstance,
  type OnConnect,
} from '../model/use-connect-instance';
import './connect-instance-form.css';

export function ConnectInstanceForm({ onConnect }: { onConnect: OnConnect }) {
  const { busy, error, connect } = useConnectInstance(onConnect);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void connect({
      idInstance: String(data.get('idInstance')).trim(),
      apiTokenInstance: String(data.get('apiTokenInstance')),
      apiUrl: String(data.get('apiUrl')),
    });
  }

  return (
    <div className="connect-instance">
      <form onSubmit={submit} autoComplete="off" aria-busy={busy}>
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
          Создайте инстанс MAX и авторизуйте его в личном кабинете. В настройках
          очистите webhookUrl и включите получение уведомлений о входящих
          сообщениях. После изменения настроек подождите минуту.
        </p>
      </details>
    </div>
  );
}
