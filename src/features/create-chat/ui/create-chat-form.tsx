import { useEffect, useRef, type FormEvent } from 'react';
import './create-chat-form.css';

export interface CreateChatFormProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onCreate: () => Promise<void>;
  busy: boolean;
  error: string;
}

export function CreateChatForm({
  phone,
  onPhoneChange,
  onCreate,
  busy,
  error,
}: CreateChatFormProps) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onCreate();
  }

  return (
    <form className="new-chat-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor="phone">Номер телефона</label>
      <input
        ref={input}
        id="phone"
        type="tel"
        required
        placeholder="+7 999 123-45-67"
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
        disabled={busy}
        autoComplete="off"
      />
      <p className="field-hint">Международный формат: +7 или +375</p>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? 'Ищем получателя…' : 'Создать чат'}
      </button>
    </form>
  );
}
