import './receive-status.css';

export function ReceiveStatus({
  error,
  stopped,
  onRetry,
}: {
  error: string;
  stopped: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <div className="receive-error" role="alert">
      <span>
        {error}{' '}
        {stopped
          ? 'Получение сообщений остановлено.'
          : 'Повторяем подключение…'}
      </span>
      {stopped && (
        <button type="button" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}
