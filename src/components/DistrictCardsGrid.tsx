import React, { useState } from 'react';
import { DistrictSummary, Clinic, DistrictName } from '../types';
import { DistrictDetailModal } from './DistrictDetailModal';
import { ProgressScale } from './ProgressScale';

interface DistrictCardsGridProps {
  districtSummaries: DistrictSummary[];
  clinics: Clinic[];
  selectedDistrict: DistrictName | 'ทั้งหมด';
  onSelectClinicToEdit: (clinic: Clinic) => void;
  tvMode: boolean;
}

export const DistrictCardsGrid: React.FC<DistrictCardsGridProps> = ({
  districtSummaries,
  clinics,
  selectedDistrict,
  onSelectClinicToEdit,
  tvMode,
}) => {
  const [selectedSummaryForModal, setSelectedSummaryForModal] = useState<DistrictSummary | null>(null);

  const filteredSummaries = selectedDistrict === 'ทั้งหมด'
    ? districtSummaries
    : districtSummaries.filter((district) => district.district === selectedDistrict);

  return (
    <section className="space-y-4" aria-labelledby="district-summary-title">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm text-emerald-300 shadow-sm" aria-hidden="true">
            <i className="fa-solid fa-map-location-dot"></i>
          </span>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">District performance</p>
            <h2 id="district-summary-title" className="font-display text-lg font-bold leading-snug text-slate-950 sm:text-xl">
              สถานะการประเมินรายอำเภอ
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              เปรียบเทียบผลลัพธ์ของทั้ง 7 อำเภอ และเปิดดูรายชื่อคลินิกในแต่ละพื้นที่
            </p>
          </div>
        </div>
        {selectedDistrict !== 'ทั้งหมด' && (
          <span className="self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 sm:self-auto">
            กำลังแสดง: อำเภอ{selectedDistrict}
          </span>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${filteredSummaries.length === 1 ? 'xl:grid-cols-1' : 'xl:grid-cols-3'} ${tvMode ? 'lg:gap-6' : ''}`}>
        {filteredSummaries.map((summary) => {
          const districtClinics = clinics.filter((clinic) => clinic.district === summary.district);
          const isTargetAchieved = summary.isTargetAchieved;
          const assessedPercentage = summary.totalClinics > 0
            ? Math.round((summary.assessedCount / summary.totalClinics) * 100)
            : 0;
          const remainingCount = Math.max(
            Math.ceil(summary.totalClinics * (summary.targetPercentage / 100)) - summary.passedCount,
            0,
          );
          const clinicPreview = districtClinics.slice(0, 3);

          return (
            <article
              key={summary.district}
              className={`group relative flex min-h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] ${
                isTargetAchieved ? 'border-emerald-200/90 hover:border-emerald-300' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`h-1 w-full ${isTargetAchieved ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-hidden="true"></div>
              <div className={`flex flex-1 flex-col ${tvMode ? 'p-6' : 'p-5'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm shadow-sm ${
                      isTargetAchieved ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                    }`} aria-hidden="true">
                      <i className="fa-solid fa-building-user"></i>
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display truncate text-lg font-bold text-slate-950">อำเภอ{summary.district}</h3>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">{summary.totalClinics} สถานพยาบาลเป้าหมาย</p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
                    isTargetAchieved
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200'
                      : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200'
                  }`}>
                    <i className={`fa-solid ${isTargetAchieved ? 'fa-circle-check' : 'fa-clock'}`}></i>
                    {isTargetAchieved ? 'ผ่านเป้าหมาย' : `ขาดอีก ${remainingCount} แห่ง`}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/70 py-3">
                  <div className="px-2 text-center">
                    <span className="block text-[10px] font-semibold text-slate-500">ประเมินแล้ว</span>
                    <strong className="font-display mt-1 block text-xl font-bold text-slate-900">{summary.assessedCount}</strong>
                  </div>
                  <div className="px-2 text-center">
                    <span className="block text-[10px] font-semibold text-emerald-700">ผ่าน L2+</span>
                    <strong className="font-display mt-1 block text-xl font-bold text-emerald-700">{summary.passedCount}</strong>
                  </div>
                  <div className="px-2 text-center">
                    <span className="block text-[10px] font-semibold text-amber-700">รอติดตาม</span>
                    <strong className="font-display mt-1 block text-xl font-bold text-amber-700">{summary.pendingCount}</strong>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">อัตราผ่านเกณฑ์ RDU</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">ประเมินแล้ว {assessedPercentage}% ของเป้าหมาย</p>
                    </div>
                    <div className="text-right">
                      <strong className={`font-display block text-2xl font-bold leading-none ${isTargetAchieved ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {summary.passPercentage}%
                      </strong>
                      <span className="text-[9px] font-semibold text-slate-400">เกณฑ์ {summary.targetPercentage}%</span>
                    </div>
                  </div>
                  <ProgressScale
                    value={summary.passPercentage}
                    target={summary.targetPercentage}
                    achieved={isTargetAchieved}
                    compact
                    ariaLabel={`อัตราผ่านเกณฑ์ RDU อำเภอ${summary.district}`}
                  />
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700">ตัวอย่างรายชื่อคลินิก</p>
                    <button
                      type="button"
                      onClick={() => setSelectedSummaryForModal(summary)}
                      className="text-[11px] font-bold text-emerald-700 transition hover:text-emerald-900 hover:underline"
                    >
                      ดูทั้งหมด {districtClinics.length} แห่ง
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {clinicPreview.map((clinic) => {
                      const isAssessed = clinic.assessmentStatus === 'ประเมินแล้ว';
                      const isPassed = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2;
                      return (
                        <button
                          type="button"
                          key={clinic.id}
                          onClick={() => onSelectClinicToEdit(clinic)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                          aria-label={`ดูรายละเอียด ${clinic.name}`}
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${
                            isPassed ? 'bg-emerald-500' : isAssessed ? 'bg-rose-400' : 'bg-amber-400'
                          }`} aria-hidden="true"></span>
                          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-600">{clinic.name}</span>
                          {clinic.assessmentLevel !== null && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">L{clinic.assessmentLevel}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSummaryForModal(summary)}
                  className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <span>เปิดรายละเอียดอำเภอ</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <DistrictDetailModal
        isOpen={selectedSummaryForModal !== null}
        onClose={() => setSelectedSummaryForModal(null)}
        summary={selectedSummaryForModal}
        clinics={clinics}
        onSelectClinicToEdit={onSelectClinicToEdit}
      />
    </section>
  );
};
