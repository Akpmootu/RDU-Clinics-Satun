import React, { useEffect, useRef, useState } from 'react';
import { SettingsConfig, AppUser } from '../types';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  settings: SettingsConfig;
  userRole: 'admin' | 'user';
  currentUser: AppUser | null;
  pendingUsersCount: number;
  onOpenAdminLogin: (mode?: 'login' | 'register') => void;
  onLogoutAdmin: () => void;
  onOpenUserManagement: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  searchTerm,
  setSearchTerm,
  settings,
  userRole,
  currentUser,
  pendingUsersCount,
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenUserManagement,
  activeTab,
  setActiveTab,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin =
    currentUser?.role === 'super_admin' && currentUser.status === 'active';

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openAdminMenu = () => {
    setAccountMenuOpen(false);
    setSidebarOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={sidebarOpen ? 'ปิดแถบเมนูหลัก' : 'เปิดแถบเมนูหลัก'}
              aria-expanded={sidebarOpen}
            >
              <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} text-lg`}></i>
              {userRole === 'admin' && pendingUsersCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                  {pendingUsersCount > 9 ? '9+' : pendingUsersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className="flex min-w-0 items-center gap-2 text-left sm:gap-2.5"
              onClick={() => setActiveTab('landing')}
              aria-label="กลับหน้าหลัก"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20 sm:h-10 sm:w-10">
                <i className="fa-solid fa-pills text-lg sm:text-xl"></i>
              </span>
              <span className="hidden min-w-0 flex-col justify-center xs:flex sm:flex">
                <span className="flex items-center gap-1.5">
                  <span className="whitespace-nowrap text-sm font-bold leading-tight text-slate-900 sm:text-base lg:text-lg">
                    RDU Clinics <span className="font-extrabold text-emerald-600">Satun</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    2569
                  </span>
                </span>
                <span className="hidden items-center gap-1 truncate text-[10px] text-slate-500 sm:flex lg:text-xs">
                  <i className="fa-solid fa-hospital text-[9px] text-emerald-500"></i>
                  สำนักงานสาธารณสุขจังหวัดสตูล
                </span>
              </span>
            </button>
          </div>

          <div className="mx-2 hidden max-w-md flex-1 items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => setActiveTab('landing')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                activeTab === 'landing'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-house"></i>
              <span>หน้าหลัก</span>
            </button>
            <div className="relative w-full">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาคลินิกหรืออำเภอ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-100/80 py-2 pl-9 pr-9 text-xs transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-sm"
                aria-label="ค้นหาคลินิก"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
                  aria-label="ล้างคำค้นหา"
                >
                  <i className="fa-solid fa-circle-xmark text-xs"></i>
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 lg:flex"
              title={settings.isLiveApiActive ? 'เชื่อมต่อ Google Sheets แล้ว' : 'กำลังใช้ข้อมูลสำรองในเครื่อง'}
            >
              <span className={`h-2 w-2 rounded-full ${settings.isLiveApiActive ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span className="text-[11px] font-semibold text-slate-700">
                {settings.isLiveApiActive ? 'Sheets Live' : 'Local Data'}
              </span>
            </div>

            {userRole === 'admin' ? (
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="flex h-10 max-w-[210px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-left shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900 text-white">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <i className="fa-solid fa-user-shield text-xs text-emerald-300"></i>
                    )}
                    {pendingUsersCount > 0 && isSuperAdmin && (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white"></span>
                    )}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-xs font-bold text-slate-900">
                      {currentUser?.name || 'Admin'}
                    </span>
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                      {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                  </span>
                  <i className={`fa-solid fa-chevron-down hidden text-[9px] text-slate-400 transition sm:block ${accountMenuOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.5rem)] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                  >
                    <div className="rounded-xl bg-slate-900 p-3 text-white">
                      <p className="truncate text-sm font-bold">{currentUser?.name || 'Admin'}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{currentUser?.emailOrId}</p>
                    </div>

                    <div className="mt-2 space-y-1">
                      {isSuperAdmin && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onOpenUserManagement();
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-amber-50 hover:text-amber-900"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                            <i className="fa-solid fa-users-gear"></i>
                          </span>
                          <span className="flex-1">
                            <span className="block">จัดการผู้ใช้งาน</span>
                            <span className="block text-[10px] font-normal text-slate-400">สิทธิ์และการอนุมัติบัญชี</span>
                          </span>
                          {pendingUsersCount > 0 && (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                              {pendingUsersCount}
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={openAdminMenu}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <i className="fa-solid fa-table-columns"></i>
                        </span>
                        <span>
                          <span className="block">เปิดเมนูผู้ดูแล</span>
                          <span className="block text-[10px] font-normal text-slate-400">เครื่องมือและตั้งค่าระบบ</span>
                        </span>
                      </button>
                    </div>

                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onLogoutAdmin();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                          <i className="fa-solid fa-right-from-bracket"></i>
                        </span>
                        ออกจากระบบ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenAdminLogin('register')}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  title="ลงทะเบียนเจ้าหน้าที่"
                >
                  <i className="fa-solid fa-user-plus text-emerald-600"></i>
                  <span className="hidden sm:inline">ลงทะเบียน</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAdminLogin('login')}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  title="เข้าสู่ระบบเจ้าหน้าที่"
                >
                  <i className="fa-solid fa-right-to-bracket text-slate-500"></i>
                  <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ค้นหาชื่อคลินิก, ผู้รับอนุญาต..."
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 pl-9 pr-9 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
              aria-label="ค้นหาคลินิกมือถือ"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"
                aria-label="ล้างคำค้นหา"
              >
                <i className="fa-solid fa-circle-xmark text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
