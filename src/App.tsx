import { useState } from 'react';
import type { GreenApiClient } from '@/shared/api';
import { LoginForm } from './components/LoginForm';
import { ChatApp } from './components/ChatApp';

export function App() {
  const [session, setSession] = useState<{
    client: GreenApiClient;
    id: string;
  } | null>(null);
  return session ? (
    <ChatApp
      client={session.client}
      instanceId={session.id}
      onLogout={() => setSession(null)}
    />
  ) : (
    <LoginForm onConnect={(client, id) => setSession({ client, id })} />
  );
}
