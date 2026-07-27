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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-md md:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => tab.id === 'admin-menu' ? onOpenMenu() : setActiveTab(tab.id)}
            className={`relative flex min-w-[56px] flex-col items-center justify-center rounded-xl px-2 py-1 text-center transition ${
              isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-label={tab.label}
          >
            {tab.id === 'admin-menu' && pendingUsersCount > 0 && (
              <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                {pendingUsersCount > 9 ? '9+' : pendingUsersCount}
              </span>
            )}
            <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-100 text-emerald-700' : ''}`}>
              <i className={`${tab.icon} text-base`}></i>
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
