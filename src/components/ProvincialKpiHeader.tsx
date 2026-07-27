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
}

export const ProvincialKpiHeader: React.FC<ProvincialKpiHeaderProps> = ({
  summary,
  selectedDistrict,
  setSelectedDistrict,
  tvMode,
  onOpenUpdateModal,
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

  const targetClinicCount = Math.ceil(
    totalTargetClinics * (overallTargetPercentage / 100)
  );
  const remainingToTarget = Math.max(targetClinicCount - passedClinics, 0);

  return (
    <section className="space-y-3 sm:space-y-4">
      {/* Executive Hero Banner & Provincial KPI Container */}
      <div className={`relative overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white p-4 shadow-sm transition-all sm:rounded-3xl sm:p-6 ${
        tvMode ? 'ring-2 ring-emerald-500 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30' : ''
      }`}>
        
        {/* Subtle Decorative Background Glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-100/60 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Title & Status Badge */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center sm:pb-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold leading-snug text-emerald-800 sm:px-3 sm:text-xs">
                <i className="fa-solid fa-square-check text-emerald-600"></i>
                <span>เป้าหมายจังหวัด: ผ่านเกณฑ์ ≥ ระดับ 2 ไม่น้อยกว่า 25%</span>
              </span>
              {isProvinceTargetAchieved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs sm:text-xs">
                  <i className="fa-solid fa-trophy text-amber-300"></i>
                  <span>บรรลุเป้าหมายแล้ว!</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 sm:text-xs">
                  <i className="fa-solid fa-hourglass-half text-amber-500"></i>
                  <span>อยู่ระหว่างดำเนินการ</span>
                </span>
              )}
            </div>
            <h2 className="text-lg font-extrabold leading-snug tracking-tight text-slate-900 sm:text-2xl">
              ระบบติดตามการประเมินการใช้ยาอย่างสมเหตุผล (RDU) ในคลินิกเอกชน จังหวัดสตูล
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 sm:text-sm">
              ข้อมูลสรุปผลการประเมินตนเองของคลินิกเอกชน ประจำปีงบประมาณ 2569 (สำนักงานสาธารณสุขจังหวัดสตูล)
            </p>
          </div>

          <div className="flex w-full items-center gap-2 self-start sm:w-auto lg:self-auto">
            <button
              onClick={onOpenUpdateModal}
              className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg sm:w-auto sm:rounded-xl sm:text-sm"
              aria-label="บันทึกผลการประเมินคลินิก"
            >
              <i className="fa-solid fa-pen-to-square text-sm group-hover:scale-110 transition-transform"></i>
              <span>บันทึก/อัปเดตสถานะ</span>
            </button>
          </div>
        </div>

        {/* 4 Main KPI Cards */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 min-[390px]:grid-cols-2 sm:mt-5 sm:gap-3.5 lg:grid-cols-4">
          
          {/* Card 1: Total Clinics Target */}
          <div className="group min-h-28 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 shadow-xs transition hover:border-slate-300 hover:bg-white sm:min-h-0 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">เป้าหมายคลินิกทั้งหมด</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-clinic-medical"></i>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalTargetClinics}</span>
              <span className="text-xs font-medium text-slate-500">แห่ง</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <i className="fa-solid fa-map-location-dot text-slate-400"></i>
              <span>ครอบคลุม 7 อำเภอ</span>
            </p>
          </div>

          {/* Card 2: Assessed Clinics */}
          <div className="group min-h-28 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 shadow-xs transition hover:border-slate-300 hover:bg-white sm:min-h-0 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">ได้รับการประเมินแล้ว</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{assessedClinics}</span>
              <span className="text-xs font-medium text-slate-500">แห่ง</span>
              <span className="text-xs font-semibold text-indigo-600 ml-auto">
                {totalTargetClinics > 0 ? ((assessedClinics / totalTargetClinics) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">
              สำรวจแล้วในพื้นที่สตูล
            </p>
          </div>

          {/* Card 3: Passed (Level 2+) */}
          <div className="group min-h-28 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 shadow-xs transition hover:bg-emerald-50 sm:min-h-0 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold leading-snug text-emerald-800 sm:text-xs">ผ่านเกณฑ์ (≥ ระดับ 2)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm group-hover:scale-110 transition-transform shadow-xs">
                <i className="fa-solid fa-circle-check"></i>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900">{passedClinics}</span>
              <span className="text-xs font-medium text-emerald-700">แห่ง</span>
              <span className="text-sm font-extrabold text-emerald-700 ml-auto bg-emerald-200/60 px-2 py-0.5 rounded-md">
                {overallPassPercentage}%
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <i className="fa-solid fa-bullseye text-emerald-600"></i>
              <span>เกณฑ์เป้าหมาย {overallTargetPercentage}%</span>
            </p>
          </div>

          {/* Card 4: Pending Clinics */}
          <div className="group min-h-28 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-xs transition hover:bg-amber-50 sm:min-h-0 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold leading-snug text-amber-800 sm:text-xs">รอการประเมิน / ปรับปรุง</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm group-hover:scale-110 transition-transform shadow-xs">
                <i className="fa-solid fa-clock text-sm"></i>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-900">{pendingClinics}</span>
              <span className="text-xs font-medium text-amber-700">แห่ง</span>
              <span className="text-xs font-semibold text-amber-700 ml-auto">
                {totalTargetClinics > 0 ? ((pendingClinics / totalTargetClinics) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              รอทีมประเมิน สสจ./สสอ.
            </p>
          </div>

        </div>

        {/* Provincial Target Progress Gauge Bar — always uses a true 0–100% scale */}
        <div className="mt-5 border-t border-slate-100 pt-4 sm:mt-6 sm:pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  ความก้าวหน้าการผ่านเกณฑ์ RDU ระดับ 2+ ทั้งจังหวัด
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                  สเกลเต็ม 100%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                แถบสีแสดงผลที่ดำเนินการแล้วจริง ส่วนเส้นสีเข้มคือเกณฑ์ขั้นต่ำที่จังหวัดต้องผ่าน
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="block text-[10px] font-medium text-emerald-700">ดำเนินการแล้ว</span>
                <strong className="text-lg font-extrabold text-emerald-800">{overallPassPercentage}%</strong>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="block text-[10px] font-medium text-slate-500">เกณฑ์ที่ต้องผ่าน</span>
                <strong className="text-lg font-extrabold text-slate-800">{overallTargetPercentage}%</strong>
              </div>
              <div className="col-span-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 sm:col-span-1">
                <span className="block text-[10px] font-medium text-blue-700">
                  {isProvinceTargetAchieved ? 'สูงกว่าเป้าหมาย' : 'ต้องผ่านเพิ่ม'}
                </span>
                <strong className="text-sm font-extrabold text-blue-800">
                  {isProvinceTargetAchieved
                    ? `+${Math.max(overallPassPercentage - overallTargetPercentage, 0).toFixed(1)}%`
                    : `${remainingToTarget} แห่ง`}
                </strong>
              </div>
            </div>
          </div>

          <div className="relative mt-4">
            <ProgressScale
              value={overallPassPercentage}
              target={overallTargetPercentage}
              achieved={isProvinceTargetAchieved}
              ariaLabel="ความก้าวหน้าการผ่านเกณฑ์ RDU ระดับจังหวัด"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              ผ่านแล้ว {passedClinics} จาก {totalTargetClinics} แห่ง
            </span>
            <span className="font-medium text-slate-600">
              เป้าหมายขั้นต่ำ {targetClinicCount} แห่ง ({overallTargetPercentage}%)
            </span>
          </div>
        </div>

        {/* District Selection Pills Bar */}
        <div className="mt-5 flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pb-1 pt-3 scrollbar-none sm:mt-6">
          <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <i className="fa-solid fa-filter text-emerald-600"></i>
            <span>เลือกอำเภอ:</span>
          </span>
          <button
            onClick={() => setSelectedDistrict('ทั้งหมด')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition ${
              selectedDistrict === 'ทั้งหมด'
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทุกอำเภอ ({totalTargetClinics})
          </button>
          {SATUN_DISTRICTS.map((district) => {
            const isSelected = selectedDistrict === district;
            const distSummary = summary.districtSummaries.find((d) => d.district === district);
            const count = distSummary ? distSummary.totalClinics : 0;

            return (
              <button
                key={district}
                onClick={() => setSelectedDistrict(district)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>อำเภอ{district}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
