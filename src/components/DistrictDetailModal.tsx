import React, { useState } from 'react';
import { DistrictSummary, Clinic } from '../types';
import { ProgressScale } from './ProgressScale';

interface DistrictDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DistrictSummary | null;
  clinics: Clinic[];
  onSelectClinicToEdit: (clinic: Clinic) => void;
}

export const DistrictDetailModal: React.FC<DistrictDetailModalProps> = ({
  isOpen,
  onClose,
  summary,
  clinics,
  onSelectClinicToEdit,
}) => {
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assessed' | 'pending'>('all');

  if (!isOpen || !summary) return null;

  // Get clinics for this specific district
  const districtClinics = clinics.filter((c) => c.district === summary.district);

  // Apply search/filter
  const filteredClinics = districtClinics.filter((c) => {
    const matchesText =
      c.name.toLowerCase().includes(filterText.toLowerCase()) ||
      c.licenseeName.toLowerCase().includes(filterText.toLowerCase()) ||
      c.type.toLowerCase().includes(filterText.toLowerCase());

    if (filterStatus === 'assessed') {
      return matchesText && c.assessmentStatus === 'ประเมินแล้ว';
    }
    if (filterStatus === 'pending') {
      return matchesText && c.assessmentStatus === 'รอประเมิน';
    }
    return matchesText;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-200 font-bold text-lg shadow-inner">
              <i className="fa-solid fa-map-location-dot"></i>
            </div>
            <div className="min-w-0">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <h3 className="text-base sm:text-xl font-extrabold leading-snug text-white">
                  ข้อมูลการประเมิน RDU - อำเภอ{summary.district}
                </h3>
                {summary.isTargetAchieved ? (
                  <span className="shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400 text-slate-900">
                    ผ่านเกณฑ์ {summary.targetPercentage}%
                  </span>
                ) : (
                  <span className="shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-900">
                    กำลังประเมิน
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                จังหวัดสตูล • มีสถานพยาบาลเป้าหมายรวมทั้งสิ้น {summary.totalClinics} แห่ง
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition focus:outline-none"
            aria-label="ปิดหน้าต่าง"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="block text-xs font-semibold text-slate-500">เป้าหมายทั้งหมด</span>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 block">
                {summary.totalClinics} <span className="text-xs font-normal text-slate-500">แห่ง</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 text-center">
              <span className="block text-xs font-semibold text-sky-700">ประเมินตนเองแล้ว</span>
              <span className="text-xl sm:text-2xl font-extrabold text-sky-900 mt-0.5 block">
                {summary.assessedCount} <span className="text-xs font-normal text-sky-600">แห่ง</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="block text-xs font-semibold text-emerald-700">ผ่านเกณฑ์ (≥ L2)</span>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-0.5 block">
                {summary.passedCount} <span className="text-xs font-normal text-emerald-600">แห่ง</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
              <span className="block text-xs font-semibold text-amber-700">อัตราผ่านเกณฑ์</span>
              <span className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-0.5 block">
                {summary.passPercentage}%
              </span>
            </div>
          </div>

          {/* Progress Scale */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  ความก้าวหน้าการผ่านเกณฑ์ RDU
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  แสดงสัดส่วนจริงจาก 0–100% พร้อมตำแหน่งเกณฑ์ที่ต้องผ่าน
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-200">
                  ผ่านแล้ว {summary.passedCount}/{summary.totalClinics} แห่ง
                </span>
                <span
                  className={`rounded-full px-3 py-1.5 ${
                    summary.isTargetAchieved
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {summary.isTargetAchieved ? 'ผ่านเกณฑ์แล้ว' : 'กำลังดำเนินการ'}
                </span>
              </div>
            </div>

            <ProgressScale
              value={summary.passPercentage}
              target={summary.targetPercentage}
              achieved={summary.isTargetAchieved}
              ariaLabel={`ความก้าวหน้าการผ่านเกณฑ์ RDU อำเภอ${summary.district}`}
            />
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <i className="fa-solid fa-magnifying-glass text-xs"></i>
              </div>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="ค้นชื่อคลินิก, ประเภท, ผู้รับอนุญาต..."
                className="w-full pl-8 pr-8 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-500"
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>

            {/* Status Segment Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filterStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({districtClinics.length})
              </button>
              <button
                onClick={() => setFilterStatus('assessed')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filterStatus === 'assessed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ประเมินแล้ว ({summary.assessedCount})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รอประเมิน ({summary.pendingCount})
              </button>
            </div>
          </div>

          {/* Clinics Table / Cards List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-hospital-user text-emerald-600"></i>
              <span>รายชื่อคลินิกเอกชน อำเภอ{summary.district} ({filteredClinics.length} รายการ)</span>
            </h4>

            {filteredClinics.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <i className="fa-solid fa-hospital-circle-xmark text-3xl text-slate-300 mb-2"></i>
                <p className="text-sm font-semibold text-slate-600">ไม่พบรายการคลินิกที่ตรงกับเงื่อนไข</p>
                <p className="text-xs text-slate-400 mt-0.5">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะด้านบน</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredClinics.map((clinic, index) => {
                  const isAssessed = clinic.assessmentStatus === 'ประเมินแล้ว';
                  const isPassed = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2;

                  return (
                    <div
                      key={clinic.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        {/* Top Badge Row */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400">
                            ลำดับที่ {index + 1}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isAssessed ? (
                              isPassed ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                  <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                  <span>ผ่านเกณฑ์ (L{clinic.assessmentLevel})</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                  <i className="fa-solid fa-circle-xmark text-rose-600"></i>
                                  <span>ไม่ผ่าน (L{clinic.assessmentLevel})</span>
                                </span>
                              )
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <i className="fa-solid fa-hourglass-start text-amber-500"></i>
                                <span>รอประเมิน</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Clinic Name & Licensee */}
                        <div>
                          <h5 className="text-sm font-bold text-slate-900 leading-snug">
                            {clinic.name}
                          </h5>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <i className="fa-solid fa-user-doctor text-[10px] text-slate-400"></i>
                            <span>{clinic.licenseeName || 'ไม่ระบุผู้รับอนุญาต'}</span>
                          </p>
                        </div>

                        {/* Clinic Type Tag */}
                        <div className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                          <i className="fa-solid fa-notes-medical text-emerald-600 mr-1.5"></i>
                          <span>{clinic.type}</span>
                        </div>
                      </div>

                      {/* Card Footer Action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>อัปเดต: {clinic.lastAssessedDate || '-'}</span>
                        <button
                          onClick={() => {
                            onClose();
                            onSelectClinicToEdit(clinic);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-eye text-emerald-400"></i>
                          <span>ดูรายละเอียด / อัปเดต</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            * คลิกที่ "ดูรายละเอียด / อัปเดต" เพื่อเปิดดูคะแนนและอัปเดตผลประเมิน RDU
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
