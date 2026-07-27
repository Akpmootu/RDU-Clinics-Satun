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

  // Filter district summaries based on dropdown selection
  const filteredSummaries = selectedDistrict === 'ทั้งหมด'
    ? districtSummaries
    : districtSummaries.filter((d) => d.district === selectedDistrict);

  return (
    <section className="space-y-3 sm:space-y-4">
      {/* Section Title */}
      <div className="flex items-center justify-between px-1">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
            <i className="fa-solid fa-map-location-dot"></i>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
              สถานะการประเมินแยกรายอำเภอ (7 อำเภอในจังหวัดสตูล)
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
              แสดงสถิติและแท็กสถานะคลินิกเอกชนแต่ละอำเภอ สามารถคลิกรายละเอียดเพื่อดูรายชื่อทั้งอำเภอได้
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid Container */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {filteredSummaries.map((summary) => {
          const districtClinics = clinics.filter((c) => c.district === summary.district);
          const isTargetAchieved = summary.isTargetAchieved;

          return (
            <div
              key={summary.district}
              className={`relative flex flex-col justify-between rounded-[1.4rem] border bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:rounded-2xl sm:p-5 ${
                isTargetAchieved
                  ? 'border-emerald-200/90 hover:border-emerald-300'
                  : 'border-slate-200/90 hover:border-slate-300'
              } ${tvMode ? 'p-6' : ''}`}
            >
              {/* Card Header: District Name & Target Achievement Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs ${
                      isTargetAchieved ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}>
                      <i className="fa-solid fa-building-user text-sm"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-extrabold text-slate-900">
                        อำเภอ{summary.district}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        จ.สตูล • {summary.totalClinics} สถานพยาบาล
                      </p>
                    </div>
                  </div>

                  {/* Pass Status Tag */}
                  {isTargetAchieved ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800 sm:px-2.5 sm:text-[11px]">
                      <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
                      <span>ผ่านเกณฑ์ 25%</span>
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 sm:px-2.5 sm:text-[11px]">
                      <i className="fa-solid fa-clock text-amber-500 text-xs"></i>
                      <span>กำลังประเมิน</span>
                    </span>
                  )}
                </div>

                {/* Localized Metrics Summary */}
                <div className="my-4 grid grid-cols-2 gap-2 text-center min-[400px]:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                    <span className="block text-[10px] font-medium text-slate-500">เป้าหมาย</span>
                    <span className="text-base font-extrabold text-slate-800">{summary.totalClinics}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] text-indigo-600 font-medium">ประเมินแล้ว</span>
                    <span className="text-base font-extrabold text-indigo-700">{summary.assessedCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="block text-[10px] text-emerald-700 font-medium">ผ่าน L2+</span>
                    <span className="text-base font-extrabold text-emerald-700">{summary.passedCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="block text-[10px] text-amber-700 font-medium">รอประเมิน</span>
                    <span className="text-base font-extrabold text-amber-700">{summary.pendingCount}</span>
                  </div>
                </div>

                {/* Completion Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-600">อัตราผ่านเกณฑ์ RDU</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-extrabold ${isTargetAchieved ? 'text-emerald-600' : 'text-amber-700'}`}>
                        {summary.passPercentage}%
                      </span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                        เกณฑ์ {summary.targetPercentage}%
                      </span>
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

                {/* Visual Clinic Status Badges (Interactive Tags) */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <i className="fa-solid fa-tags text-slate-400"></i>
                      <span>รายชื่อคลินิกในอำเภอ ({districtClinics.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSummaryForModal(summary)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      ดูทั้งหมด ({districtClinics.length})
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {districtClinics.map((clinic) => {
                      const isAssessed = clinic.assessmentStatus === 'ประเมินแล้ว';
                      const isPassed = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2;

                      return (
                        <button
                          key={clinic.id}
                          onClick={() => onSelectClinicToEdit(clinic)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 text-left group/badge ${
                            isAssessed
                              ? isPassed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={`${clinic.name} - คลิกเพื่อดูรายละเอียด/อัปเดต`}
                          aria-label={`ดูรายละเอียด ${clinic.name}`}
                        >
                          {/* Icon Status */}
                          {isAssessed ? (
                            isPassed ? (
                              <i className="fa-solid fa-circle-check text-emerald-600 text-xs shrink-0"></i>
                            ) : (
                              <i className="fa-solid fa-circle-xmark text-rose-500 text-xs shrink-0"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-hourglass-start text-amber-500 text-xs shrink-0"></i>
                          )}

                          <span className="truncate max-w-[150px] font-medium group-hover/badge:underline">
                            {clinic.name}
                          </span>

                          {/* Level Badge if Assessed */}
                          {clinic.assessmentLevel !== null && (
                            <span className="ml-auto px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/80 border border-slate-200 text-slate-700">
                              L{clinic.assessmentLevel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-file-signature text-emerald-600"></i>
                  <span>ประเมินแล้ว {summary.assessedCount}/{summary.totalClinics}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSummaryForModal(summary)}
                  className="text-emerald-700 font-bold hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition flex items-center gap-1 hover:underline"
                >
                  <span>รายละเอียด</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* District Clinic List Modal */}
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
