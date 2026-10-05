import { ReceiveStatus } from '@/features/receive-messages';
import { ChatConversation } from '@/widgets/chat-conversation';
import { ChatSidebar } from '@/widgets/chat-sidebar';
import type { GreenApiClient } from '@/shared/api';
import { useChatWorkspace } from '../model/use-chat-workspace';
import './chat-page.css';

export function ChatPage({
  client,
  instanceId,
  onLogout,
}: {
  client: GreenApiClient;
  instanceId: string;
  onLogout: () => void;
}) {
  const workspace = useChatWorkspace(client);
  return (
    <main className="chat-page">
      <ReceiveStatus {...workspace.receiving} />
      <div
        className={`chat-shell ${workspace.active ? 'has-active-chat' : ''}`}
      >
        <ChatSidebar
          chats={workspace.chats}
          activeId={workspace.activeId}
          instanceId={instanceId}
          receiveError={workspace.receiving.error}
          stopped={workspace.receiving.stopped}
          showNewChat={workspace.showNewChat}
          createChat={workspace.createChat}
          onToggleNewChat={workspace.toggleNewChat}
          onSelect={workspace.selectChat}
          onLogout={onLogout}
        />
        <ChatConversation
          chat={workspace.active}
          draft={workspace.draft}
          busy={workspace.busy}
          onDraftChange={workspace.changeDraft}
          onSend={workspace.sendMessage}
          onBack={workspace.backToList}
        />
      </div>
    </main>
  );
}
