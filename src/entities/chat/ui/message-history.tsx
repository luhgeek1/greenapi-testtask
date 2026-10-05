import { useEffect, useRef } from 'react';
import { Icon } from '@/shared/ui';
import type { Message } from '../model/chat';
import { formatDay, formatTime } from '../lib/format-date';
import './chat.css';

export function MessageHistory({ messages }: { messages: Message[] }) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div
      className="messages"
      role="log"
      aria-label="Сообщения в чате"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.length === 0 && (
        <div className="chat-start-note">
          <Icon name="chat" />
          <p>Начните разговор</p>
          <span>Отправьте первое сообщение получателю.</span>
        </div>
      )}
      {messages.map((message, index) => (
        <div key={`${message.direction}-${message.id}`}>
          {(index === 0 ||
            formatDay(messages[index - 1].timestamp) !==
              formatDay(message.timestamp)) && (
            <div className="date-divider">{formatDay(message.timestamp)}</div>
          )}
          <div className={`message-row ${message.direction}`}>
            <div className="message-bubble">
              <p>{message.text}</p>
              <div className="message-meta">
                <time dateTime={new Date(message.timestamp).toISOString()}>
                  {formatTime(message.timestamp)}
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
  );
}
