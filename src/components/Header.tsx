import React from 'react';
import { SettingsConfig } from '../types';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  tvMode: boolean;
  setTvMode: (tv: boolean | ((prev: boolean) => boolean)) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  settings: SettingsConfig;
  userRole: 'admin' | 'user';
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  onOpenSettings: () => void;
  onOpenGasCode: () => void;
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
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenSettings,
  onOpenGasCode,
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

            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('landing')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                <i className="fa-solid fa-pills text-xl"></i>
              </div>
              <div className="hidden xs:block">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    RDU Clinics <span className="text-emerald-600 font-extrabold">Satun</span>
                  </h1>
                  <span className="hidden md:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    2569
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <i className="fa-solid fa-hospital text-[10px] text-emerald-500"></i>
                  <span>สำนักงานสาธารณสุขจังหวัดสตูล</span>
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
            
            {/* Role Status Badge */}
            {userRole === 'admin' ? (
              <button
                type="button"
                onClick={onLogoutAdmin}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-emerald-400 border border-slate-700 flex items-center gap-1.5 shadow-xs hover:bg-slate-800 transition"
                title="คลิกเพื่อออกจากระบบแอดมิน"
              >
                <i className="fa-solid fa-user-shield text-xs"></i>
                <span className="hidden sm:inline">Admin Mode</span>
                <i className="fa-solid fa-right-from-bracket text-[10px] text-slate-400 ml-0.5"></i>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 flex items-center gap-1.5 transition"
                title="คลิกเพื่อเข้าสู่ระบบแอดมิน"
              >
                <i className="fa-solid fa-user text-slate-500 text-xs"></i>
                <span className="hidden sm:inline">ผู้ใช้งานทั่วไป</span>
              </button>
            )}

            {/* Live API Status Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${settings.isLiveApiActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-700">
                {settings.isLiveApiActive ? 'Google Sheets Live' : 'Local Storage'}
              </span>
            </div>

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

            {/* Settings Button - Only visible for Admin */}
            {userRole === 'admin' && (
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
