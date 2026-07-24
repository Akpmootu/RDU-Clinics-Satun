import React from 'react';
import { DistrictName, AppUser } from '../types';
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
  onOpenAdminLogin: (mode?: 'login' | 'register') => void;
  onLogoutAdmin: () => void;
  onOpenSettings: () => void;
  onOpenGasCode: () => void;
  onOpenUserManagement: () => void;
}

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
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenSettings,
  onOpenGasCode,
  onOpenUserManagement,
}) => {

  const menuItems = [
    {
      id: 'landing',
      label: 'หน้าหลัก (Landing Page)',
      subLabel: 'ภาพรวมระบบ & เกณฑ์ RDU',
      icon: 'fa-solid fa-house',
      badge: 'แนะนำ',
    },
    {
      id: 'dashboard',
      label: 'แดชบอร์ดภาพรวม',
      subLabel: 'Overview Dashboard',
      icon: 'fa-solid fa-chart-line',
      badge: null,
    },
    {
      id: 'cards',
      label: 'การ์ดสรุปรายอำเภอ',
      subLabel: 'District Cards',
      icon: 'fa-solid fa-grip',
      badge: '7 อำเภอ',
    },
    {
      id: 'clinics',
      label: 'ข้อมูลคลินิกทั้งหมด',
      subLabel: 'DataTables Master',
      icon: 'fa-solid fa-table-list',
      badge: `${totalClinicsCount} แห่ง`,
    },
    {
      id: 'charts',
      label: 'กราฟิกและสถิติ',
      subLabel: 'Visual Analytics',
      icon: 'fa-solid fa-chart-pie',
      badge: null,
    },
    {
      id: 'audit-logs',
      label: 'ประวัติการแก้ไข',
      subLabel: 'Audit Trail Logs',
      icon: 'fa-solid fa-clock-rotate-left',
      badge: 'เรียลไทม์',
    },
    {
      id: 'admin-login',
      label: 'เข้าสู่ระบบผู้ดูแลระบบ',
      subLabel: 'Admin Login (OAuth)',
      icon: 'fa-solid fa-[#00A67E] fa-shield-halved text-[#00A67E]',
      badge: 'OAuth 2.0',
    },
  ];

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Upper Navigation Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* User / System Info Card with Role Switcher */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-800 text-white shadow-md space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-200 shrink-0 overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <i className={`fa-solid ${userRole === 'admin' ? 'fa-user-shield' : 'fa-user'} text-lg`}></i>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[10px] font-semibold text-emerald-100 uppercase tracking-wider flex items-center gap-1">
                  <span>{userRole === 'admin' ? (currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin') : 'Guest'}</span>
                  {currentUser?.provider === 'google' && <i className="fa-brands fa-google text-rose-300"></i>}
                  {currentUser?.provider === 'line' && <i className="fa-brands fa-line text-emerald-300"></i>}
                </h2>
                <p className="text-xs font-bold text-white truncate">
                  {userRole === 'admin' ? (currentUser?.name || 'Admin User') : 'ผู้ใช้งานทั่วไป'}
                </p>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="truncate">{currentUser?.emailOrId ? maskIdentifier(currentUser.emailOrId) : 'ระบบพร้อมใช้งาน 2569'}</span>
                </div>
              </div>
            </div>

            {/* Role Action Switch */}
            <div className="pt-2 border-t border-white/10">
              {userRole === 'admin' ? (
                <button
                  onClick={onLogoutAdmin}
                  className="w-full py-1.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-right-from-bracket text-xs text-rose-300"></i>
                  <span>ออกจากระบบ</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAdminLogin}
                  className="w-full py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <i className="fa-solid fa-key text-xs"></i>
                  <span>เข้าสู่ระบบ Admin</span>
                </button>
              )}
            </div>
            
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white/10 rounded-lg p-1.5">
                <span className="block text-[10px] text-emerald-200">คลินิกทั้งหมด</span>
                <span className="font-bold text-white">{totalClinicsCount} แห่ง</span>
              </div>
              <div className="bg-white/10 rounded-lg p-1.5">
                <span className="block text-[10px] text-emerald-200">ผ่านเกณฑ์แล้ว</span>
                <span className="font-bold text-emerald-300">{passedCount} แห่ง</span>
              </div>
            </div>
          </div>

          {/* Main Navigation Menu */}
          <div>
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              เมนูหลัก (Navigation)
            </h3>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`${item.icon} text-base ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}></i>
                      <div>
                        <span className="block text-xs sm:text-sm">{item.label}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">{item.subLabel}</span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* District Quick Filter */}
          <div>
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>คัดกรองรายอำเภอ</span>
              <i className="fa-solid fa-location-dot text-emerald-500 text-xs"></i>
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedDistrict('ทั้งหมด')}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                  selectedDistrict === 'ทั้งหมด'
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>ทุกอำเภอ (สตูล)</span>
                <i className="fa-solid fa-globe text-[10px]"></i>
              </button>
              {SATUN_DISTRICTS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDistrict(d)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                    selectedDistrict === d
                      ? 'bg-emerald-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>อำเภอ{d}</span>
                  <i className="fa-solid fa-chevron-right text-[9px] opacity-60"></i>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Actions Footer inside Sidebar */}
        {userRole === 'admin' ? (
          <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50/80">
            {(currentUser?.role === 'super_admin' || currentUser?.emailOrId === 'akaporn1234@gmail.com') && (
              <button
                onClick={() => {
                  onOpenUserManagement();
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold transition shadow-xs"
              >
                <i className="fa-solid fa-users-gear text-slate-900"></i>
                <span>จัดการสิทธิ์ผู้ใช้งาน (User)</span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenGasCode();
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition shadow-2xs"
            >
              <i className="fa-solid fa-code text-emerald-600"></i>
              <span>คัดลอก Code.gs</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition shadow-xs"
            >
              <i className="fa-solid fa-gear"></i>
              <span>ตั้งค่า Google Sheets & Bot</span>
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50/80">
            <button
              onClick={() => {
                onOpenAdminLogin('register');
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <i className="fa-solid fa-user-plus text-xs"></i>
              <span>ลงทะเบียนเจ้าหน้าที่</span>
            </button>

            <button
              onClick={() => {
                onOpenAdminLogin('login');
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition shadow-2xs"
            >
              <i className="fa-solid fa-right-to-bracket text-emerald-600"></i>
              <span>เข้าสู่ระบบเจ้าหน้าที่</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
