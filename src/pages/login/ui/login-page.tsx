import {
  ConnectInstanceForm,
  type OnConnect,
} from '@/features/connect-instance';
import { Brand } from '@/shared/ui';
import './login-page.css';

export function LoginPage({ onConnect }: { onConnect: OnConnect }) {
  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <div className="login-heading">
          <h1>Войдите в чат</h1>
          <p>Подключите свой инстанс и общайтесь в MAX.</p>
        </div>
        <ConnectInstanceForm onConnect={onConnect} />
      </div>
      <p className="login-footer">Текстовые сообщения · GREEN-API для MAX</p>
    </main>
  );
}
