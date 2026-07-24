import React from 'react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUpdateModal?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'landing', label: 'หน้าหลัก', icon: 'fa-solid fa-house' },
    { id: 'dashboard', label: 'แดชบอร์ด', icon: 'fa-solid fa-chart-line' },
    { id: 'cards', label: 'อำเภอ', icon: 'fa-solid fa-grip' },
    { id: 'clinics', label: 'คลินิก', icon: 'fa-solid fa-table-list' },
    { id: 'charts', label: 'สถิติ', icon: 'fa-solid fa-chart-pie' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl text-center transition ${
              isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-label={tab.label}
          >
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
