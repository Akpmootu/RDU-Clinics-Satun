import React from 'react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'admin' | 'user';
  pendingUsersCount: number;
  onOpenMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  pendingUsersCount,
  onOpenMenu,
}) => {
  const tabs = [
    { id: 'landing', label: 'หน้าหลัก', icon: 'fa-solid fa-house' },
    { id: 'dashboard', label: 'แดชบอร์ด', icon: 'fa-solid fa-chart-line' },
    { id: 'cards', label: 'อำเภอ', icon: 'fa-solid fa-grip' },
    { id: 'clinics', label: 'คลินิก', icon: 'fa-solid fa-table-list' },
    userRole === 'admin'
      ? { id: 'admin-menu', label: 'เมนูแอดมิน', icon: 'fa-solid fa-bars-staggered' }
      : { id: 'charts', label: 'สถิติ', icon: 'fa-solid fa-chart-pie' },
  ];

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
      aria-label="เมนูหลัก"
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-around gap-0.5 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => tab.id === 'admin-menu' ? onOpenMenu() : setActiveTab(tab.id)}
              className={`relative flex min-h-[3.5rem] min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1.5 py-1 text-center transition sm:min-h-[3.75rem] sm:max-w-28 ${
                isActive
                  ? 'font-semibold text-emerald-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.id === 'admin-menu' && pendingUsersCount > 0 && (
                <span className="absolute right-[calc(50%_-_1.35rem)] top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                  {pendingUsersCount > 9 ? '9+' : pendingUsersCount}
                </span>
              )}
              <span
                className={`flex h-7 min-w-10 items-center justify-center rounded-full px-3 transition ${
                  isActive ? 'bg-emerald-100 text-emerald-700 shadow-inner' : ''
                }`}
              >
                <i className={`${tab.icon} text-[15px] sm:text-base`}></i>
              </span>
              <span className="mt-0.5 max-w-full truncate text-[9px] leading-tight min-[380px]:text-[10px] sm:text-[11px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
