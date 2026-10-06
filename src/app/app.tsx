import { useEffect, useState } from 'react';
import { DashboardPage } from '@/pages/dashboard';

export function App() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('demo')) {
      url.searchParams.delete('demo');
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);

  return (
    <DashboardPage
      key={demo ? 'demo' : 'live'}
      demo={demo}
      onModeChange={() => setDemo((current) => !current)}
    />
  );
}
