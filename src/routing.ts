export type AppTab =
  | 'landing'
  | 'dashboard'
  | 'cards'
  | 'clinics'
  | 'charts'
  | 'audit-logs'
  | 'admin-login';

export const TAB_PATHS: Record<AppTab, string> = {
  landing: '/',
  dashboard: '/dashboard',
  cards: '/districts',
  clinics: '/clinics',
  charts: '/analytics',
  'audit-logs': '/audit-log',
  'admin-login': '/admin/login',
};

export function tabFromPath(pathname: string): AppTab {
  if (pathname.startsWith('/admin')) return 'admin-login';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/districts')) return 'cards';
  if (pathname.startsWith('/clinics')) return 'clinics';
  if (pathname.startsWith('/analytics') || pathname.startsWith('/charts')) return 'charts';
  if (pathname.startsWith('/audit-log')) return 'audit-logs';
  return 'landing';
}

export function clinicFilterFromSearch(search: string): 'all' | 'assessed' | 'passed' | 'pending' {
  const params = new URLSearchParams(search);
  const filter = params.get('filter');
  return filter === 'assessed' || filter === 'passed' || filter === 'pending' ? filter : 'all';
}
