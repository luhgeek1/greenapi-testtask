import { useState } from 'react';
import type { GreenApiClient } from '@/shared/api';
import { LoginPage } from '@/pages/login';
import { ChatPage } from '@/pages/chat';

export function App() {
  const [session, setSession] = useState<{
    client: GreenApiClient;
    id: string;
  } | null>(null);
  return session ? (
    <ChatPage
      client={session.client}
      instanceId={session.id}
      onLogout={() => setSession(null)}
    />
  ) : (
    <LoginPage onConnect={(client, id) => setSession({ client, id })} />
  );
}
