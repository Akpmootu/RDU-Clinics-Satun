import React from 'react';
import { SettingsConfig, AppUser } from '../types';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  tvMode: boolean;
  setTvMode: (tv: boolean | ((prev: boolean) => boolean)) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  settings: SettingsConfig;
  userRole: 'admin' | 'user';
  currentUser: AppUser | null;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  onOpenSettings: () => void;
  onOpenGasCode: () => void;
  onOpenUserManagement: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  tvMode,
  setTvMode,
  searchTerm,
  setSearchTerm,
  settings,
  userRole,
  currentUser,
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenSettings,
  onOpenGasCode,
  onOpenUserManagement,
  activeTab,
  setActiveTab,
}) => {

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left Section: Hamburger & Branding */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="เปิดปิดแถบเมนูหลัก"
            >
              <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
            </button>

            <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer" onClick={() => setActiveTab('landing')}>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
                <i className="fa-solid fa-pills text-lg sm:text-xl"></i>
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-tight whitespace-nowrap">
                    RDU Clinics <span className="text-emerald-600 font-extrabold">Satun</span>
                  </h1>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    2569
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 truncate">
                  <i className="fa-solid fa-hospital text-[9px] sm:text-[10px] text-emerald-500"></i>
                  <span className="hidden sm:inline">สำนักงานสาธารณสุขจังหวัดสตูล</span>
                  <span className="sm:hidden">สสจ.สตูล</span>
                </p>
              </div>
            </div>
          </div>

          {/* Center Search Input & Landing Nav Button */}
          <div className="hidden md:flex flex-1 items-center gap-2 max-w-xs lg:max-w-md mx-4">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'landing'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-house"></i>
              <span>หน้าหลัก</span>
            </button>

            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <i className="fa-solid fa-magnifying-glass text-sm"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อคลินิก, อำเภอ..."
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                aria-label="ค้นหาคลินิก"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label="ล้างคำค้นหา"
                >
                  <i className="fa-solid fa-circle-xmark text-xs"></i>
                </button>
              )}
            </div>
          </div>

          {/* Right Section: Role Status Badge & Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Role Status Badge / User Profile */}
            {userRole === 'admin' ? (
              <div className="flex items-center gap-1.5">
                {/* User Profile Badge */}
                <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white border border-slate-700 flex items-center gap-1.5 shadow-xs">
                  {currentUser?.provider === 'google' ? (
                    <i className="fa-brands fa-google text-rose-400 text-xs"></i>
                  ) : currentUser?.provider === 'line' ? (
                    <i className="fa-brands fa-line text-emerald-400 text-xs"></i>
                  ) : (
                    <i className="fa-solid fa-user-shield text-emerald-400 text-xs"></i>
                  )}
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {currentUser?.name || 'Admin'}
                  </span>
                  {currentUser?.role === 'super_admin' && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-900">
                      Super
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  title="ออกจากระบบ"
                  aria-label="ออกจากระบบ"
                >
                  <i className="fa-solid fa-right-from-bracket text-xs"></i>
                </button>

                {/* Super Admin User Management Button */}
                {(currentUser?.role === 'super_admin' || currentUser?.emailOrId === 'akaporn1234@gmail.com') && (
                  <button
                    type="button"
                    onClick={onOpenUserManagement}
                    className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
                    title="จัดการสิทธิ์ผู้ใช้งาน (User Management)"
                  >
                    <i className="fa-solid fa-users-gear text-amber-600 text-sm"></i>
                    <span className="hidden xl:inline">จัดการ User</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 flex items-center gap-1.5 transition"
                title="เข้าสู่ระบบเจ้าหน้าที่"
              >
                <i className="fa-solid fa-user text-slate-500 text-xs"></i>
                <span className="hidden sm:inline">เข้าสู่ระบบเจ้าหน้าที่</span>
              </button>
            )}

            {/* Live API Status Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${settings.isLiveApiActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-700">
                {settings.isLiveApiActive ? 'Google Sheets Live' : 'Local Storage'}
              </span>
            </div>

            {/* Admin-only Tools: TV Mode, Code.gs, Settings */}
            {userRole === 'admin' && (
              <>
                {/* TV Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setTvMode((prev) => !prev)}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    tvMode
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="เปิด/ปิด โหมดแสดงผลหน้าจอ TV Dashboard"
                  aria-label="โหมด TV Display"
                >
                  <i className="fa-solid fa-tv text-sm"></i>
                  <span className="hidden sm:inline">TV Mode</span>
                </button>

                {/* Google Apps Script Code Button */}
                <button
                  type="button"
                  onClick={onOpenGasCode}
                  className="p-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition text-xs font-medium flex items-center gap-1.5"
                  title="ดูโค้ด Google Apps Script (Code.gs)"
                  aria-label="โค้ด Google Apps Script"
                >
                  <i className="fa-solid fa-code text-emerald-600 text-sm"></i>
                  <span className="hidden lg:inline">Code.gs</span>
                </button>

                {/* Settings Button */}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="p-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition text-xs font-medium flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  title="ตั้งค่าระบบ และ Telegram Webhook"
                  aria-label="ตั้งค่าระบบ"
                >
                  <i className="fa-solid fa-gear text-slate-600 text-sm"></i>
                  <span className="hidden xl:inline">ตั้งค่า</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* Mobile Search Bar (Below Header on Small Screens) */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อคลินิก, ผู้รับอนุญาต..."
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500"
              aria-label="ค้นหาคลินิกมือถือ"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400"
                aria-label="ล้างค้นหา"
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
