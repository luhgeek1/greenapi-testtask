import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { errorMessage } from '@/shared/api';
import { Icon } from '@/shared/ui';

export function MessageComposer({
  onSend,
  text,
  onTextChange,
  busy,
}: {
  onSend: (text: string) => Promise<void>;
  text: string;
  onTextChange: (text: string) => void;
  busy: boolean;
}) {
  const [error, setError] = useState('');
  const sending = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || busy || !text.trim()) return;
    sending.current = true;
    setError('');
    try {
      await onSend(text);
    } catch (cause) {
      setError(
        `${errorMessage(cause)} Текст сохранён. Если ответ потерялся, проверьте MAX перед повторной отправкой.`,
      );
    } finally {
      sending.current = false;
      input.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
    <div className="composer-area">
      {error && (
        <p className="error-box send-error" role="alert">
          {error}
        </p>
      )}
      <form className="composer" onSubmit={send} aria-busy={busy}>
        <textarea
          ref={input}
          aria-label="Сообщение"
          placeholder="Напишите сообщение…"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={4000}
          rows={1}
          disabled={busy}
        />
        <button
          type="submit"
          className="send-button"
          aria-label="Отправить сообщение"
          disabled={busy || !text.trim()}
        >
          {busy ? <span className="spinner" /> : <Icon name="send" />}
        </button>
      </form>
      <div className="composer-hint">
        <span>Enter — отправить · Shift + Enter — новая строка</span>
        <span>{text.length} / 4000</span>
      </div>
    </div>
  );
}
