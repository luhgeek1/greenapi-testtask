import { useEffect, useRef, useState } from 'react';
import type { ApiOperation, RequestResult } from '@/features/api-request';
import { Icon } from '@/shared/ui';
import './api-response.css';

function highlight(line: string) {
  return line
    .split(
      /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\b\d+(?:\.\d+)?\b)/g,
    )
    .map((part, index) => {
      const kind = part.endsWith(':')
        ? 'key'
        : part.startsWith('"')
          ? 'string'
          : /^(true|false|null|-?\d)/.test(part)
            ? 'value'
            : 'plain';
      return (
        <span key={index} className={`json-${kind}`}>
          {part}
        </span>
      );
    });
}

export function ApiResponsePanel({
  result,
  history,
  pending,
  onClear,
}: {
  result: RequestResult | null;
  history: RequestResult[];
  pending: ApiOperation['method'] | null;
  onClear: () => void;
}) {
  const [copiedText, setCopiedText] = useState('');
  const [copyError, setCopyError] = useState('');
  const content = useRef<HTMLDivElement>(null);
  const text = result ? JSON.stringify(result.data, null, 2) : '';

  useEffect(() => {
    if (content.current)
      content.current.scrollTop = content.current.scrollHeight;
  }, [history, pending]);

  async function copy() {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
    } catch {
      setCopyError(
        'Не удалось скопировать ответ. Выделите текст и скопируйте вручную.',
      );
    }
  }

  function clear() {
    setCopiedText('');
    setCopyError('');
    onClear();
  }

  return (
    <section
      className="response-panel"
      aria-labelledby="response-title"
      aria-busy={Boolean(pending)}
    >
      <header className="terminal-header">
        <h2 id="response-title" aria-label="API Response">
          API Terminal Logs
        </h2>
        <div className="terminal-tools">
          <span
            className={`request-status ${result?.error ? 'error' : result ? 'success' : ''}`}
            role="status"
          >
            {pending ? (
              <>
                <span className="spinner" />
                Выполняем запрос…
              </>
            ) : result ? (
              result.status !== undefined ? (
                `HTTP ${result.status} · ${(result.duration / 1000).toFixed(2)} с`
              ) : (
                'Запрос не выполнен'
              )
            ) : (
              'Готов к запросу'
            )}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => void copy()}
            disabled={!result || Boolean(pending)}
            aria-label={
              text && copiedText === text
                ? 'Ответ скопирован'
                : 'Копировать ответ'
            }
            title="Копировать ответ"
          >
            <Icon name={text && copiedText === text ? 'check' : 'copy'} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={clear}
            disabled={history.length === 0 || Boolean(pending)}
            aria-label="Очистить ответ"
            title="Очистить терминал"
          >
            <Icon name="clear" />
          </button>
        </div>
      </header>
      <div
        className="terminal-content"
        ref={content}
        tabIndex={0}
        aria-label="Журнал API"
      >
        {history.length === 0 && <p className="terminal-ready">&gt; Ready.</p>}
        {history.map((entry) => (
          <div
            className={`terminal-entry ${entry.error ? 'has-error' : ''}`}
            key={entry.id}
          >
            <details
              className="terminal-response"
              onToggle={(event) => {
                const panel = content.current;
                if (!panel || !event.currentTarget.open) return;
                const visible = panel.getBoundingClientRect();
                const expanded = event.currentTarget.getBoundingClientRect();
                if (expanded.bottom > visible.bottom) {
                  panel.scrollTop += Math.min(
                    expanded.bottom - visible.bottom,
                    Math.max(0, expanded.top - visible.top),
                  );
                }
              }}
            >
              <summary className="terminal-command">
                <span className="terminal-chevron" aria-hidden="true">
                  &gt;
                </span>
                <span className="terminal-method">{entry.method}</span>
                <span
                  className={
                    entry.error
                      ? 'terminal-error-code'
                      : 'terminal-success-code'
                  }
                >
                  {entry.status ?? 'ERROR'}
                </span>
              </summary>
              <pre
                className="json-output"
                aria-label={entry === result ? 'Тело ответа API' : undefined}
              >
                <code>
                  {JSON.stringify(entry.data, null, 2)
                    .split('\n')
                    .map((line, lineIndex) => (
                      <span className="code-line" key={lineIndex}>
                        {highlight(line)}
                        {'\n'}
                      </span>
                    ))}
                </code>
              </pre>
            </details>
            {entry === result && entry.error && (
              <p className="response-error" role="alert">
                {entry.error}
              </p>
            )}
          </div>
        ))}
        {pending && (
          <p className="terminal-pending">
            &gt; Running {pending}
            <span className="loading-dots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        )}
        {copyError && (
          <p className="response-error" role="alert">
            {copyError}
          </p>
        )}
      </div>
    </section>
  );
}
