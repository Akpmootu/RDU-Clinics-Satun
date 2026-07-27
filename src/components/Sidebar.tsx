import React, { useEffect, useState } from 'react';
import { DistrictName, AppUser, SettingsConfig } from '../types';
import { SATUN_DISTRICTS } from '../data/initialData';
import { maskIdentifier } from '../services/userService';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDistrict: DistrictName | 'ทั้งหมด';
  setSelectedDistrict: (district: DistrictName | 'ทั้งหมด') => void;
  totalClinicsCount: number;
  passedCount: number;
  userRole: 'admin' | 'user';
  currentUser: AppUser | null;
  settings: SettingsConfig;
  pendingUsersCount: number;
  tvMode: boolean;
  setTvMode: (tv: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAdminLogin: (mode?: 'login' | 'register') => void;
  onLogoutAdmin: () => void;
  onOpenSettings: () => void;
  onOpenGasCode: () => void;
  onOpenUserManagement: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  badge?: string;
}

const NavigationButton: React.FC<{
  item: NavigationItem;
  active: boolean;
  onClick: () => void;
}> = ({ item, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
      active
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-xs'
        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-emerald-600'
      }`}
    >
      <i className={`${item.icon} text-sm`}></i>
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-xs font-bold">{item.label}</span>
      <span className={`block truncate text-[10px] ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
        {item.description}
      </span>
    </span>
    {item.badge && (
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
          active ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {item.badge}
      </span>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  activeTab,
  setActiveTab,
  selectedDistrict,
  setSelectedDistrict,
  totalClinicsCount,
  passedCount,
  userRole,
  currentUser,
  settings,
  pendingUsersCount,
  tvMode,
  setTvMode,
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenSettings,
  onOpenGasCode,
  onOpenUserManagement,
}) => {
  const [districtsExpanded, setDistrictsExpanded] = useState(false);
  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.emailOrId.toLowerCase() === 'akaporn1234@gmail.com';

  const overviewItems: NavigationItem[] = [
    {
      id: 'landing',
      label: 'หน้าหลัก',
      description: 'ข้อมูลระบบและเกณฑ์ RDU',
      icon: 'fa-solid fa-house',
    },
    {
      id: 'dashboard',
      label: 'แดชบอร์ดภาพรวม',
      description: 'ติดตามผลการดำเนินงานจังหวัด',
      icon: 'fa-solid fa-chart-line',
    },
    {
      id: 'cards',
      label: 'สรุปรายอำเภอ',
      description: 'เปรียบเทียบทั้ง 7 อำเภอ',
      icon: 'fa-solid fa-map-location-dot',
      badge: '7 อำเภอ',
    },
  ];

  const dataItems: NavigationItem[] = [
    {
      id: 'clinics',
      label: 'ข้อมูลคลินิกทั้งหมด',
      description: 'ค้นหาและดูรายละเอียดคลินิก',
      icon: 'fa-solid fa-table-list',
      badge: `${totalClinicsCount} แห่ง`,
    },
    {
      id: 'charts',
      label: 'กราฟและสถิติ',
      description: 'วิเคราะห์ผลการประเมิน',
      icon: 'fa-solid fa-chart-pie',
    },
    {
      id: 'audit-logs',
      label: 'ประวัติการแก้ไข',
      description: 'ตรวจสอบกิจกรรมย้อนหลัง',
      icon: 'fa-solid fa-clock-rotate-left',
    },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  const runAdminAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(22rem,92vw)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="เมนูหลัก"
        aria-hidden={!isOpen}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
              <i className="fa-solid fa-pills"></i>
            </span>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                RDU Clinics <span className="text-emerald-600">Satun</span>
              </p>
              <p className="text-[10px] text-slate-400">เมนูการใช้งานระบบ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="ปิดเมนู"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 text-white shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <i className={`fa-solid ${userRole === 'admin' ? 'fa-user-shield' : 'fa-user'} text-emerald-200`}></i>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">
                    {userRole === 'admin' ? currentUser?.name || 'Admin User' : 'ผู้ใช้งานทั่วไป'}
                  </p>
                  {isSuperAdmin && (
                    <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-900">
                      SUPER
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-300">
                  {currentUser?.emailOrId ? maskIdentifier(currentUser.emailOrId) : 'Guest access'}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <p className="text-[9px] text-slate-300">คลินิกทั้งหมด</p>
                <p className="mt-0.5 text-sm font-extrabold">{totalClinicsCount} แห่ง</p>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <p className="text-[9px] text-slate-300">ผ่านเกณฑ์</p>
                <p className="mt-0.5 text-sm font-extrabold text-emerald-300">{passedCount} แห่ง</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              ภาพรวม
            </h2>
            <nav className="space-y-1" aria-label="เมนูภาพรวม">
              {overviewItems.map((item) => (
                <NavigationButton
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  onClick={() => navigate(item.id)}
                />
              ))}
            </nav>
          </section>

          <section>
            <h2 className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              ข้อมูลและรายงาน
            </h2>
            <nav className="space-y-1" aria-label="เมนูข้อมูลและรายงาน">
              {dataItems.map((item) => (
                <NavigationButton
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  onClick={() => navigate(item.id)}
                />
              ))}
            </nav>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDistrictsExpanded((expanded) => !expanded)}
              className="flex w-full items-center justify-between bg-slate-50 px-3 py-3 text-left transition hover:bg-slate-100"
              aria-expanded={districtsExpanded}
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <i className="fa-solid fa-location-dot text-emerald-600"></i>
                คัดกรองรายอำเภอ
              </span>
              <span className="flex items-center gap-2">
                <span className="max-w-24 truncate rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                  {selectedDistrict === 'ทั้งหมด' ? 'ทุกอำเภอ' : selectedDistrict}
                </span>
                <i className={`fa-solid fa-chevron-down text-[9px] text-slate-400 transition ${districtsExpanded ? 'rotate-180' : ''}`}></i>
              </span>
            </button>
            {districtsExpanded && (
              <div className="grid grid-cols-2 gap-1 border-t border-slate-200 p-2">
                {(['ทั้งหมด', ...SATUN_DISTRICTS] as Array<DistrictName | 'ทั้งหมด'>).map((district) => (
                  <button
                    key={district}
                    type="button"
                    onClick={() => {
                      setSelectedDistrict(district);
                      setActiveTab('dashboard');
                      setIsOpen(false);
                    }}
                    className={`rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition ${
                      selectedDistrict === district
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {district === 'ทั้งหมด' ? 'ทุกอำเภอ' : `อ.${district}`}
                  </button>
                ))}
              </div>
            )}
          </section>

          {userRole === 'admin' && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-800">
                  งานผู้ดูแลระบบ
                </h2>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                  พร้อมใช้งาน
                </span>
              </div>

              <div className="space-y-1.5">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => runAdminAction(onOpenUserManagement)}
                    className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-white px-3 py-3 text-left transition hover:bg-amber-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <i className="fa-solid fa-users-gear"></i>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold text-slate-900">จัดการผู้ใช้งาน</span>
                      <span className="block text-[10px] text-slate-500">อนุมัติบัญชีและกำหนดสิทธิ์</span>
                    </span>
                    {pendingUsersCount > 0 ? (
                      <span className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-black text-white">
                        รอ {pendingUsersCount}
                      </span>
                    ) : (
                      <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTvMode((mode) => !mode)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    tvMode
                      ? 'border-amber-300 bg-amber-100 text-amber-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tvMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <i className="fa-solid fa-tv text-xs"></i>
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold">โหมดแสดงผล TV</span>
                    <span className="block text-[10px] opacity-70">{tvMode ? 'เปิดใช้งานอยู่' : 'แสดง Dashboard เต็มจอ'}</span>
                  </span>
                  <span className={`relative h-5 w-9 rounded-full transition ${tvMode ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${tvMode ? 'left-[18px]' : 'left-0.5'}`}></span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => runAdminAction(onOpenGasCode)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-emerald-700">
                    <i className="fa-solid fa-code text-xs"></i>
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold">Google Apps Script</span>
                    <span className="block text-[10px] text-slate-400">ดูและคัดลอก Code.gs</span>
                  </span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                </button>

                <button
                  type="button"
                  onClick={() => runAdminAction(onOpenSettings)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <i className="fa-solid fa-gear text-xs"></i>
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold">ตั้งค่าระบบ</span>
                    <span className="block text-[10px] text-slate-400">Google Sheets และ Telegram</span>
                  </span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-[10px]">
                <span className="font-semibold text-slate-500">แหล่งข้อมูล</span>
                <span className={`flex items-center gap-1.5 font-bold ${settings.isLiveApiActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${settings.isLiveApiActive ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {settings.isLiveApiActive ? 'Google Sheets Live' : 'Local Storage'}
                </span>
              </div>
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4">
          {userRole === 'admin' ? (
            <div className="space-y-2">
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => runAdminAction(onOpenUserManagement)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-xs font-black text-slate-900 transition hover:bg-amber-600"
                >
                  <i className="fa-solid fa-users-gear"></i>
                  จัดการผู้ใช้งาน
                  {pendingUsersCount > 0 && (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] text-amber-800">
                      {pendingUsersCount}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => runAdminAction(onLogoutAdmin)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => runAdminAction(() => onOpenAdminLogin('register'))}
                className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                ลงทะเบียน
              </button>
              <button
                type="button"
                onClick={() => runAdminAction(() => onOpenAdminLogin('login'))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                เข้าสู่ระบบ
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
