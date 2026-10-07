import { useEffect, useRef, useState } from 'react';
import type { RequestResult } from '@/features/api-log';
import type { ApiMethod } from '@/shared/api';
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

function ApiResponseEntry({
  entry,
  latest,
  onExpand,
}: {
  entry: RequestResult;
  latest: boolean;
  onExpand: (element: HTMLElement) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const element = useRef<HTMLDivElement>(null);
  return (
    <div
      className={`terminal-entry ${entry.error ? 'has-error' : ''}`}
      ref={element}
    >
      <div className="terminal-command">
        <span className="terminal-prompt" aria-hidden="true">
          &gt;
        </span>
        <span className="terminal-method">{entry.method}</span>
        <span
          className={
            entry.error ? 'terminal-error-code' : 'terminal-success-code'
          }
        >
          {entry.status ?? 'ERROR'}
        </span>
      </div>
      <details
        className="terminal-response"
        onToggle={(event) => {
          setExpanded(event.currentTarget.open);
          if (event.currentTarget.open && element.current)
            onExpand(element.current);
        }}
      >
        <summary
          className="terminal-toggle"
          role="button"
          aria-expanded={expanded}
          aria-label={`Ответ ${entry.method}`}
          title={expanded ? 'Скрыть ответ' : 'Раскрыть ответ'}
        >
          <Icon name="back" className="terminal-toggle-icon" />
        </summary>
        <pre
          className="json-output"
          aria-label={latest ? 'Тело ответа API' : undefined}
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
      {latest && entry.error && <p className="response-error">{entry.error}</p>}
    </div>
  );
}

export function ApiResponsePanel({
  result,
  history,
  pending,
  diagnosticsDisabled,
  onDiagnose,
  onClear,
}: {
  result: RequestResult | null;
  history: RequestResult[];
  pending: ApiMethod | null;
  diagnosticsDisabled: boolean;
  onDiagnose: (method: 'getSettings' | 'getStateInstance') => void;
  onClear: () => void;
}) {
  const [copiedText, setCopiedText] = useState('');
  const [copyError, setCopyError] = useState('');
  const content = useRef<HTMLDivElement>(null);
  const text = result ? JSON.stringify(result.data, null, 2) : '';

  useEffect(() => {
    const panel = content.current;
    if (panel && !panel.querySelector('details[open]'))
      panel.scrollTop = panel.scrollHeight;
  }, [history, pending]);

  function scrollToExpanded(element: HTMLElement) {
    const panel = content.current;
    if (!panel) return;
    const visible = panel.getBoundingClientRect();
    const expanded = element.getBoundingClientRect();
    if (expanded.bottom > visible.bottom) {
      panel.scrollTop += Math.min(
        expanded.bottom - visible.bottom,
        Math.max(0, expanded.top - visible.top),
      );
    }
  }

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
        <div
          className="terminal-methods"
          role="group"
          aria-label="Диагностика API"
        >
          {(['getSettings', 'getStateInstance'] as const).map((method) => (
            <button
              key={method}
              type="button"
              className="terminal-method-button"
              disabled={diagnosticsDisabled || Boolean(pending)}
              aria-busy={pending === method}
              onClick={() => onDiagnose(method)}
            >
              {pending === method ? (
                <span className="spinner" />
              ) : (
                <Icon name="server" />
              )}
              {method}
            </button>
          ))}
        </div>
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
          <ApiResponseEntry
            key={entry.id}
            entry={entry}
            latest={entry === result}
            onExpand={scrollToExpanded}
          />
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
