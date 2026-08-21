import React from 'react';
import { ProvincialSummary, DistrictName } from '../types';
import { SATUN_DISTRICTS } from '../data/initialData';
import { ProgressScale } from './ProgressScale';

interface ProvincialKpiHeaderProps {
  summary: ProvincialSummary;
  selectedDistrict: DistrictName | 'ทั้งหมด';
  setSelectedDistrict: (district: DistrictName | 'ทั้งหมด') => void;
  tvMode: boolean;
  onOpenUpdateModal: () => void;
  onNavigateToClinics: (filter: 'all' | 'assessed' | 'passed' | 'pending') => void;
  onNavigateToAnalytics: () => void;
}

interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  detail: string;
  icon: string;
  tone: 'slate' | 'blue' | 'emerald' | 'amber';
  badge?: string;
  onClick: () => void;
  actionLabel: string;
  className?: string;
}

const metricTone = {
  slate: {
    icon: 'bg-slate-900 text-white',
    detail: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-700',
  },
  blue: {
    icon: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    detail: 'text-blue-700',
    badge: 'bg-blue-50 text-blue-700',
  },
  emerald: {
    icon: 'bg-emerald-600 text-white shadow-emerald-600/20',
    detail: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    detail: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit = 'แห่ง',
  detail,
  icon,
  tone,
  badge,
  onClick,
  actionLabel,
  className = '',
}) => {
  const styles = metricTone[tone];

  return (
    <button type="button" onClick={onClick} aria-label={actionLabel} className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold leading-5 text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm shadow-sm ${styles.icon}`} aria-hidden="true">
          <i className={`fa-solid ${icon}`}></i>
        </span>
      </div>
      <div className="mt-4 flex items-end gap-2">
        <strong className="font-display text-3xl font-bold leading-none tracking-tight text-slate-950 sm:text-[2rem]">{value}</strong>
        <span className="pb-0.5 text-xs font-medium text-slate-400">{unit}</span>
        {badge && (
          <span className={`ml-auto rounded-lg px-2 py-1 text-[11px] font-bold ${styles.badge}`}>
            {badge}
          </span>
        )}
      </div>
      <p className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium leading-4 ${styles.detail}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true"></span>
        {detail}
        <i className="fa-solid fa-arrow-right ml-auto opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true"></i>
      </p>
    </button>
  );
};

export const ProvincialKpiHeader: React.FC<ProvincialKpiHeaderProps> = ({
  summary,
  selectedDistrict,
  setSelectedDistrict,
  tvMode,
  onOpenUpdateModal,
  onNavigateToClinics,
  onNavigateToAnalytics,
}) => {
  const {
    totalTargetClinics,
    assessedClinics,
    passedClinics,
    pendingClinics,
    overallPassPercentage,
    overallTargetPercentage,
    isProvinceTargetAchieved,
  } = summary;

  const assessedPercentage = totalTargetClinics > 0
    ? Math.round((assessedClinics / totalTargetClinics) * 100)
    : 0;
  const pendingPercentage = totalTargetClinics > 0
    ? Math.round((pendingClinics / totalTargetClinics) * 100)
    : 0;
  const targetClinicCount = Math.ceil(totalTargetClinics * (overallTargetPercentage / 100));
  const remainingToTarget = Math.max(targetClinicCount - passedClinics, 0);
  const targetDifference = Math.max(overallPassPercentage - overallTargetPercentage, 0);

  return (
    <section className="space-y-4" aria-labelledby="provincial-dashboard-title">
      <div className={`premium-panel overflow-hidden ${tvMode ? 'ring-2 ring-emerald-500/80' : ''}`}>
        <div className="relative overflow-hidden border-b border-slate-800 bg-slate-950 px-5 py-6 text-white sm:px-7 sm:py-7 lg:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/25 blur-3xl"></div>
            <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl"></div>
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.035)_45%,transparent_70%)]"></div>
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-100 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]"></span>
                  ภาพรวมจังหวัดสตูล • ปีงบประมาณ 2569
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  isProvinceTargetAchieved
                    ? 'bg-emerald-400 text-emerald-950'
                    : 'bg-amber-300 text-amber-950'
                }`}>
                  <i className={`fa-solid ${isProvinceTargetAchieved ? 'fa-circle-check' : 'fa-clock'}`}></i>
                  {isProvinceTargetAchieved ? 'บรรลุเป้าหมายจังหวัดแล้ว' : 'อยู่ระหว่างดำเนินการ'}
                </span>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">RDU Clinic Performance</p>
              <h1 id="provincial-dashboard-title" className="font-display text-2xl font-bold leading-[1.35] tracking-tight text-white sm:text-3xl">
                ระบบติดตามการประเมินการใช้ยาอย่างสมเหตุผล
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
                คลินิกเอกชน จังหวัดสตูล — ติดตามผลการประเมิน ความก้าวหน้ารายพื้นที่ และสถานะเป้าหมายในมุมมองเดียว
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenUpdateModal}
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-emerald-950 shadow-[0_10px_28px_rgba(52,211,153,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-300 focus-visible:outline-white sm:w-auto"
              aria-label="บันทึกหรืออัปเดตผลการประเมินคลินิก"
            >
              <i className="fa-solid fa-pen-to-square"></i>
              <span>บันทึกผลการประเมิน</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-50/80 p-4 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-12">
            <MetricCard
              label="คลินิกเป้าหมายทั้งหมด"
              value={totalTargetClinics}
              detail="ครอบคลุมพื้นที่ทั้ง 7 อำเภอ"
              icon="fa-hospital"
              tone="slate"
              onClick={() => onNavigateToClinics('all')}
              actionLabel="ดูคลินิกเป้าหมายทั้งหมด"
              className="lg:col-span-2"
            />
            <MetricCard
              label="ได้รับการประเมินแล้ว"
              value={assessedClinics}
              detail="ข้อมูลการประเมินที่บันทึกในระบบ"
              icon="fa-clipboard-check"
              tone="blue"
              badge={`${assessedPercentage}%`}
              onClick={() => onNavigateToClinics('assessed')}
              actionLabel="ดูคลินิกที่ประเมินแล้ว"
              className="lg:col-span-3"
            />
            <MetricCard
              label="ผ่านเกณฑ์ระดับ 2 ขึ้นไป"
              value={passedClinics}
              detail={`เป้าหมายขั้นต่ำ ${overallTargetPercentage}%`}
              icon="fa-circle-check"
              tone="emerald"
              badge={`${overallPassPercentage}%`}
              onClick={() => onNavigateToClinics('passed')}
              actionLabel="ดูคลินิกที่ผ่านเกณฑ์ระดับ 2 ขึ้นไป"
              className="lg:col-span-4"
            />
            <MetricCard
              label="รอประเมินหรือปรับปรุง"
              value={pendingClinics}
              detail="รายการที่ยังต้องติดตามต่อ"
              icon="fa-hourglass-half"
              tone="amber"
              badge={`${pendingPercentage}%`}
              onClick={() => onNavigateToClinics('pending')}
              actionLabel="ดูคลินิกที่รอประเมินหรือปรับปรุง"
              className="lg:col-span-3"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold text-slate-950 sm:text-lg">ความก้าวหน้าตามเป้าหมายจังหวัด</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">สเกล 0–100%</span>
                  <button type="button" onClick={onNavigateToAnalytics} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100">
                    ดูกราฟเชิงลึก <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  เปรียบเทียบสัดส่วนคลินิกที่ผ่านระดับ 2 ขึ้นไป กับเกณฑ์ขั้นต่ำของจังหวัดที่ {overallTargetPercentage}%
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                <div className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-inset ring-emerald-100">
                  <span className="block text-[10px] font-semibold text-emerald-700">ผลปัจจุบัน</span>
                  <strong className="font-display mt-0.5 block text-xl font-bold text-emerald-900">{overallPassPercentage}%</strong>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200">
                  <span className="block text-[10px] font-semibold text-slate-500">เกณฑ์ขั้นต่ำ</span>
                  <strong className="font-display mt-0.5 block text-xl font-bold text-slate-900">{overallTargetPercentage}%</strong>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2.5 ring-1 ring-inset ring-blue-100">
                  <span className="block text-[10px] font-semibold text-blue-700">
                    {isProvinceTargetAchieved ? 'สูงกว่าเป้าหมาย' : 'ต้องผ่านเพิ่ม'}
                  </span>
                  <strong className="font-display mt-0.5 block text-xl font-bold text-blue-900">
                    {isProvinceTargetAchieved ? `+${targetDifference.toFixed(1)}%` : `${remainingToTarget} แห่ง`}
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <ProgressScale
                value={overallPassPercentage}
                target={overallTargetPercentage}
                achieved={isProvinceTargetAchieved}
                ariaLabel="ความก้าวหน้าการผ่านเกณฑ์ RDU ระดับจังหวัด"
              />
            </div>

            <div className="mt-2 flex flex-col gap-1.5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                ผ่านแล้ว <strong className="text-slate-800">{passedClinics} จาก {totalTargetClinics} แห่ง</strong>
              </span>
              <span>เป้าหมายขั้นต่ำ <strong className="text-slate-800">{targetClinicCount} แห่ง</strong></span>
            </div>
          </div>

          <nav className="mt-4 border-t border-slate-200/80 pt-4" aria-label="เลือกดูข้อมูลรายอำเภอ">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <i className="fa-solid fa-location-dot text-emerald-600"></i>
                เลือกพื้นที่ที่ต้องการดู
              </p>
              {selectedDistrict !== 'ทั้งหมด' && (
                <button
                  type="button"
                  onClick={() => setSelectedDistrict('ทั้งหมด')}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedDistrict('ทั้งหมด')}
                aria-pressed={selectedDistrict === 'ทั้งหมด'}
                className={`filter-chip ${selectedDistrict === 'ทั้งหมด' ? 'filter-chip-active' : ''}`}
              >
                <span>ทุกอำเภอ</span>
                <span className="filter-chip-count">{totalTargetClinics}</span>
              </button>
              {SATUN_DISTRICTS.map((district) => {
                const districtSummary = summary.districtSummaries.find((item) => item.district === district);
                const isSelected = selectedDistrict === district;
                return (
                  <button
                    type="button"
                    key={district}
                    onClick={() => setSelectedDistrict(district)}
                    aria-pressed={isSelected}
                    className={`filter-chip ${isSelected ? 'filter-chip-active' : ''}`}
                  >
                    <span>อ.{district}</span>
                    <span className="filter-chip-count">{districtSummary?.totalClinics || 0}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </section>
  );
};
