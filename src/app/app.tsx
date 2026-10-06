import { DashboardPage } from '@/pages/dashboard';

export function App() {
  const demo = new URLSearchParams(window.location.search).get('demo') === '1';
  return <DashboardPage demo={demo} />;
}
