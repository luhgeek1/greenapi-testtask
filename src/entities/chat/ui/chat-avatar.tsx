import { Icon } from '@/shared/ui';
import './chat.css';

export function ChatAvatar({ title }: { title: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {title.startsWith('+') ? (
        <Icon name="chat" />
      ) : (
        title.charAt(0).toUpperCase()
      )}
    </span>
  );
}
