import { ChatAvatar, MessageHistory, type Chat } from '@/entities/chat';
import { MessageComposer } from '@/features/send-message';
import { Icon } from '@/shared/ui';
import './chat-conversation.css';

export function ChatConversation({
  chat,
  draft,
  busy,
  onDraftChange,
  onSend,
  onBack,
}: {
  chat: Chat | undefined;
  draft: string;
  busy: boolean;
  onDraftChange: (text: string) => void;
  onSend: (text: string) => Promise<void>;
  onBack: () => void;
}) {
  return (
    <section className="conversation" aria-label="Переписка">
      {chat ? (
        <>
          <header className="conversation-header">
            <button
              className="icon-button mobile-back"
              type="button"
              aria-label="Вернуться к чатам"
              onClick={onBack}
            >
              <Icon name="back" />
            </button>
            <ChatAvatar title={chat.title} />
            <div>
              <h2>{chat.title}</h2>
              <p>
                {chat.phone && !chat.title.startsWith('+')
                  ? `+${chat.phone} · `
                  : ''}
                MAX · текстовые сообщения
              </p>
            </div>
          </header>
          <MessageHistory key={`history-${chat.id}`} messages={chat.messages} />
          <MessageComposer
            key={`composer-${chat.id}`}
            text={draft}
            onTextChange={onDraftChange}
            busy={busy}
            onSend={onSend}
          />
        </>
      ) : (
        <div className="empty-conversation">
          <div className="empty-chat-icon">
            <Icon name="chat" />
          </div>
          <h2>Ваши сообщения — здесь</h2>
          <p>
            Создайте чат по номеру телефона
            <br />
            или выберите переписку слева.
          </p>
          <span className="text-only-badge">Только текст. Всё просто.</span>
        </div>
      )}
    </section>
  );
}
