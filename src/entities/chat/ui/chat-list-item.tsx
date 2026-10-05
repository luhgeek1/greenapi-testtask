import type { Chat } from '../model/chat';
import { formatTime } from '../lib/format-date';
import { ChatAvatar } from './chat-avatar';
import './chat.css';

export function ChatListItem({
  chat,
  selected,
  onSelect,
}: {
  chat: Chat;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const last = chat.messages.at(-1);
  return (
    <button
      type="button"
      className={`chat-item ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(chat.id)}
    >
      <ChatAvatar title={chat.title} />
      <span className="chat-item-content">
        <span className="chat-item-title">{chat.title}</span>
        <span className="chat-preview">
          {last
            ? `${last.direction === 'outgoing' ? 'Вы: ' : ''}${last.text}`
            : 'Начните переписку'}
        </span>
      </span>
      <span className="chat-item-meta">
        {last && (
          <time dateTime={new Date(last.timestamp).toISOString()}>
            {formatTime(last.timestamp)}
          </time>
        )}
        {chat.unread > 0 && (
          <span
            className="unread-count"
            aria-label={`${chat.unread} непрочитанных`}
          >
            {chat.unread}
          </span>
        )}
      </span>
    </button>
  );
}
