import React from 'react';
import { ArrowRight, HeartPulse, LayoutDashboard, LogIn } from 'lucide-react';

interface LandingHeaderProps {
  userRole: 'admin' | 'user';
  onNavigateToDashboard: () => void;
  onOpenAdminLogin: (mode?: 'login' | 'register') => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  userRole,
  onNavigateToDashboard,
  onOpenAdminLogin,
}) => {
  const isAdmin = userRole === 'admin';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl no-print">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="group flex min-h-11 min-w-11 items-center gap-3 rounded-xl"
          aria-label="กลับไปด้านบนของหน้า RDU Clinics Satun"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 transition-transform group-hover:scale-105">
            <HeartPulse className="size-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-slate-950 sm:text-base">RDU Clinics Satun</span>
            <span className="hidden text-[11px] font-medium text-slate-500 sm:block">สำนักงานสาธารณสุขจังหวัดสตูล</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูหน้าแรก">
          <a
            href="#province-overview"
            className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            ภาพรวมจังหวัด
          </a>
          <a
            href="#district-progress"
            className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            ความก้าวหน้ารายอำเภอ
          </a>
          <a
            href="#rdu-levels"
            className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            เกณฑ์ RDU
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => onOpenAdminLogin('register')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100"
            >
              <i className="fa-solid fa-user-plus text-xs" aria-hidden="true" />
              <span className="hidden sm:inline">ลงทะเบียนเจ้าหน้าที่</span>
              <span className="sm:hidden">ลงทะเบียน</span>
            </button>
          )}

          <button
            type="button"
            onClick={isAdmin ? onNavigateToDashboard : () => onOpenAdminLogin('login')}
            className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:px-5"
          >
            {isAdmin ? (
              <LayoutDashboard className="size-4.5" aria-hidden="true" />
            ) : (
              <LogIn className="size-4.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {isAdmin ? 'ไปที่แดชบอร์ด' : 'เข้าสู่ระบบเจ้าหน้าที่'}
            </span>
            <span className="sm:hidden">{isAdmin ? 'แดชบอร์ด' : 'เข้าสู่ระบบ'}</span>
            <ArrowRight className="hidden size-4 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
