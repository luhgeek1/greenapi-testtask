import { ChatListItem, type Chat } from '@/entities/chat';
import {
  CreateChatForm,
  type CreateChatFormProps,
} from '@/features/create-chat';
import { Brand, Icon } from '@/shared/ui';
import './chat-sidebar.css';

export function ChatSidebar({
  chats,
  activeId,
  instanceId,
  receiveError,
  stopped,
  showNewChat,
  createChat,
  onToggleNewChat,
  onSelect,
  onLogout,
}: {
  chats: Chat[];
  activeId: string | null;
  instanceId: string;
  receiveError: string;
  stopped: boolean;
  showNewChat: boolean;
  createChat: CreateChatFormProps;
  onToggleNewChat: () => void;
  onSelect: (id: string) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar" aria-label="Список чатов">
      <div className="sidebar-brand">
        <Brand />
      </div>
      <div className="sidebar-heading">
        <h1>Чаты</h1>
        <button
          type="button"
          className="icon-button new-chat-button"
          aria-label="Новый чат"
          aria-expanded={showNewChat}
          onClick={onToggleNewChat}
        >
          <Icon name="plus" />
        </button>
      </div>
      {showNewChat && <CreateChatForm {...createChat} />}
      <nav className="chat-list" aria-label="Чаты">
        {chats.length === 0 ? (
          <div className="no-chats">
            <Icon name="chat" />
            <p>Пока нет чатов</p>
            <span>
              Добавьте номер получателя,
              <br />
              чтобы начать общение.
            </span>
          </div>
        ) : (
          chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              selected={chat.id === activeId}
              onSelect={onSelect}
            />
          ))
        )}
      </nav>
      <div className="account-footer">
        <span
          className={`account-dot ${receiveError ? 'connection-warning' : ''}`}
        />
        <span>
          <strong>
            {stopped
              ? 'Получение остановлено'
              : receiveError
                ? 'Восстанавливаем связь'
                : 'MAX подключён'}
          </strong>
          <small>Инстанс {instanceId}</small>
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Выйти из чата"
          onClick={onLogout}
        >
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
