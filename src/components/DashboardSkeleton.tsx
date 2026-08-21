import React from 'react';

const Pulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`} />
);

export const DashboardSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <section aria-label="กำลังโหลดข้อมูลแดชบอร์ด" aria-busy="true" className="space-y-4 animate-fadeIn">
    {!compact && (
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="bg-slate-950 p-6 sm:p-8">
          <Pulse className="h-6 w-44 !bg-slate-800" />
          <Pulse className="mt-5 h-10 w-3/4 !bg-slate-800" />
          <Pulse className="mt-3 h-5 w-1/2 !bg-slate-800" />
        </div>
        <div className="grid gap-3 bg-slate-50 p-4 min-[380px]:grid-cols-2 lg:grid-cols-12 sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 lg:row-span-2"><Pulse className="h-4 w-28" /><Pulse className="mt-8 h-14 w-32" /><Pulse className="mt-7 h-3 w-full" /></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3"><Pulse className="h-4 w-28" /><Pulse className="mt-5 h-9 w-20" /></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4"><Pulse className="h-4 w-32" /><Pulse className="mt-5 h-9 w-24" /></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7"><Pulse className="h-4 w-36" /><Pulse className="mt-5 h-9 w-28" /></div>
        </div>
      </div>
    )}
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 lg:col-span-8"><Pulse className="h-5 w-52" /><div className="mt-5 space-y-3">{Array.from({ length: compact ? 8 : 5 }).map((_, index) => <Pulse key={index} className="h-14 w-full" />)}</div></div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 lg:col-span-4"><Pulse className="h-5 w-36" /><Pulse className="mx-auto mt-8 h-44 w-44 rounded-full" /><Pulse className="mt-8 h-12 w-full" /></div>
    </div>
    <span className="sr-only">กำลังซิงก์ข้อมูลล่าสุดจาก Google Sheets</span>
  </section>
);
