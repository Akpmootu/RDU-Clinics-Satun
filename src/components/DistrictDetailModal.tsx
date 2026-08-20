import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DistrictSummary, Clinic } from '../types';
import { ProgressScale } from './ProgressScale';

interface DistrictDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DistrictSummary | null;
  clinics: Clinic[];
  onSelectClinicToEdit: (clinic: Clinic) => void;
}

type FilterStatus = 'all' | 'passed' | 'assessed' | 'pending';

export const DistrictDetailModal: React.FC<DistrictDetailModalProps> = ({
  isOpen,
  onClose,
  summary,
  clinics,
  onSelectClinicToEdit,
}) => {
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setFilterText('');
    setFilterStatus('all');
  }, [summary?.district]);

  const districtClinics = useMemo(
    () => summary ? clinics.filter((clinic) => clinic.district === summary.district) : [],
    [clinics, summary],
  );

  const statusCounts = useMemo(() => ({
    passed: districtClinics.filter((clinic) => clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2).length,
    assessed: districtClinics.filter((clinic) => clinic.assessmentStatus === 'ประเมินแล้ว').length,
    pending: districtClinics.filter((clinic) => clinic.assessmentStatus === 'รอประเมิน').length,
  }), [districtClinics]);

  const filteredClinics = useMemo(() => {
    const query = filterText.trim().toLocaleLowerCase('th');
    return districtClinics.filter((clinic) => {
      const matchesText = !query || [clinic.name, clinic.licenseeName, clinic.type]
        .some((value) => value.toLocaleLowerCase('th').includes(query));
      const isPassed = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2;
      const matchesStatus = filterStatus === 'all'
        || (filterStatus === 'passed' && isPassed)
        || (filterStatus === 'assessed' && clinic.assessmentStatus === 'ประเมินแล้ว')
        || (filterStatus === 'pending' && clinic.assessmentStatus === 'รอประเมิน');
      return matchesText && matchesStatus;
    });
  }, [districtClinics, filterStatus, filterText]);

  if (!isOpen || !summary) return null;

  const remainingCount = Math.max(
    Math.ceil(summary.totalClinics * (summary.targetPercentage / 100)) - summary.passedCount,
    0,
  );

  const openClinic = (clinic: Clinic) => {
    onClose();
    onSelectClinicToEdit(clinic);
  };

  const filterOptions: Array<{ key: FilterStatus; label: string; count: number }> = [
    { key: 'all', label: 'ทั้งหมด', count: districtClinics.length },
    { key: 'passed', label: 'ผ่านเกณฑ์', count: statusCounts.passed },
    { key: 'assessed', label: 'ประเมินแล้ว', count: statusCounts.assessed },
    { key: 'pending', label: 'รอประเมิน', count: statusCounts.pending },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="district-modal-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-[0_30px_100px_rgba(2,6,23,0.35)] sm:h-auto sm:max-h-[90vh] sm:rounded-[1.75rem] sm:border sm:border-white/10">
        <header className="relative shrink-0 overflow-hidden bg-slate-950 px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true"></div>
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-emerald-300 shadow-inner" aria-hidden="true">
                <i className="fa-solid fa-map-location-dot"></i>
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="district-modal-title" className="font-display text-lg font-bold leading-snug text-white sm:text-2xl">
                    อำเภอ{summary.district}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    summary.isTargetAchieved ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-amber-950'
                  }`}>
                    <i className={`fa-solid ${summary.isTargetAchieved ? 'fa-circle-check' : 'fa-clock'}`}></i>
                    {summary.isTargetAchieved ? 'ผ่านเป้าหมายแล้ว' : `ต้องผ่านเพิ่ม ${remainingCount} แห่ง`}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-300 sm:text-sm">
                  รายละเอียดผลการประเมิน RDU • {summary.totalClinics} สถานพยาบาลเป้าหมาย
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/20 hover:text-white focus-visible:outline-white"
              aria-label="ปิดหน้าต่างรายละเอียดอำเภอ"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/80">
          <div className="space-y-5 p-4 sm:p-6 lg:p-7">
            <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-label="สรุปผลการประเมินอำเภอ">
              {[
                { label: 'คลินิกเป้าหมาย', value: summary.totalClinics, tone: 'text-slate-950', surface: 'bg-white border-slate-200' },
                { label: 'ประเมินแล้ว', value: summary.assessedCount, tone: 'text-blue-800', surface: 'bg-blue-50/70 border-blue-100' },
                { label: 'ผ่านระดับ 2+', value: summary.passedCount, tone: 'text-emerald-800', surface: 'bg-emerald-50/70 border-emerald-100' },
                { label: 'อัตราผ่านเกณฑ์', value: `${summary.passPercentage}%`, tone: summary.isTargetAchieved ? 'text-emerald-800' : 'text-amber-800', surface: summary.isTargetAchieved ? 'bg-emerald-50/70 border-emerald-100' : 'bg-amber-50/70 border-amber-100' },
              ].map((metric) => (
                <div key={metric.label} className={`rounded-2xl border p-3.5 sm:p-4 ${metric.surface}`}>
                  <span className="block text-[10px] font-semibold text-slate-500 sm:text-xs">{metric.label}</span>
                  <strong className={`font-display mt-2 block text-2xl font-bold leading-none sm:text-3xl ${metric.tone}`}>{metric.value}</strong>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5" aria-labelledby="district-progress-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 id="district-progress-title" className="font-display text-sm font-bold text-slate-950 sm:text-base">ความก้าวหน้าเทียบเกณฑ์อำเภอ</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">ผลปัจจุบัน {summary.passPercentage}% เทียบกับเกณฑ์ขั้นต่ำ {summary.targetPercentage}%</p>
                </div>
                <span className={`self-start rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  summary.isTargetAchieved ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
                }`}>
                  ผ่านแล้ว {summary.passedCount}/{summary.totalClinics} แห่ง
                </span>
              </div>
              <div className="mt-4">
                <ProgressScale
                  value={summary.passPercentage}
                  target={summary.targetPercentage}
                  achieved={summary.isTargetAchieved}
                  ariaLabel={`ความก้าวหน้าการผ่านเกณฑ์ RDU อำเภอ${summary.district}`}
                />
              </div>
            </section>

            <section className="sticky top-0 z-10 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7" aria-label="ค้นหาและกรองรายชื่อคลินิก">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">ค้นหาคลินิก</span>
                  <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
                  <input
                    type="search"
                    value={filterText}
                    onChange={(event) => setFilterText(event.target.value)}
                    placeholder="ค้นหาชื่อคลินิก ประเภท หรือผู้รับอนุญาต"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  {filterText && (
                    <button
                      type="button"
                      onClick={() => setFilterText('')}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="ล้างคำค้นหา"
                    >
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                  )}
                </label>

                <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 scrollbar-none" role="group" aria-label="กรองตามสถานะ">
                  {filterOptions.map((option) => (
                    <button
                      type="button"
                      key={option.key}
                      onClick={() => setFilterStatus(option.key)}
                      aria-pressed={filterStatus === option.key}
                      className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                        filterStatus === option.key
                          ? 'bg-slate-950 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {option.label} <span className={filterStatus === option.key ? 'text-emerald-300' : 'text-slate-400'}>{option.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section aria-labelledby="clinic-list-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 id="clinic-list-title" className="font-display text-sm font-bold text-slate-950 sm:text-base">รายชื่อคลินิกเอกชน</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">พบ {filteredClinics.length} จาก {districtClinics.length} รายการ</p>
                </div>
                {(filterText || filterStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterText('');
                      setFilterStatus('all');
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>

              {filteredClinics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </span>
                  <p className="mt-3 text-sm font-bold text-slate-700">ไม่พบคลินิกที่ตรงกับเงื่อนไข</p>
                  <p className="mt-1 text-xs text-slate-400">ลองใช้คำค้นหาอื่น หรือเปลี่ยนตัวกรองสถานะ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {filteredClinics.map((clinic, index) => {
                    const isAssessed = clinic.assessmentStatus === 'ประเมินแล้ว';
                    const isPassed = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2;
                    const statusStyle = isPassed
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                      : isAssessed
                        ? 'bg-rose-50 text-rose-800 ring-rose-200'
                        : 'bg-amber-50 text-amber-800 ring-amber-200';
                    const statusLabel = isPassed
                      ? `ผ่านเกณฑ์ • L${clinic.assessmentLevel}`
                      : isAssessed
                        ? `ยังไม่ผ่าน • L${clinic.assessmentLevel ?? 0}`
                        : 'รอประเมิน';

                    return (
                      <article key={clinic.id} className="flex min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-emerald-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[10px] font-bold text-slate-400">ลำดับ {index + 1}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${statusStyle}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isPassed ? 'bg-emerald-500' : isAssessed ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-3 flex-1">
                          <h4 className="font-display text-sm font-bold leading-6 text-slate-950 sm:text-[15px]">{clinic.name}</h4>
                          <p className="mt-1.5 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
                            <i className="fa-solid fa-user-doctor mt-1 text-[9px] text-slate-400"></i>
                            <span>{clinic.licenseeName || 'ไม่ระบุผู้รับอนุญาต'}</span>
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                            <i className="fa-solid fa-notes-medical text-emerald-600"></i>
                            {clinic.type}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="text-[10px] text-slate-400">อัปเดตล่าสุด: {clinic.lastAssessedDate || 'ยังไม่มีข้อมูล'}</span>
                          <button
                            type="button"
                            onClick={() => openClinic(clinic)}
                            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-700"
                          >
                            <span>ดูรายละเอียด</span>
                            <i className="fa-solid fa-arrow-right text-[9px]"></i>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3 sm:px-7">
          <p className="hidden text-[11px] text-slate-500 sm:block">เลือก “ดูรายละเอียด” เพื่อดูคะแนนและข้อมูลการประเมินของคลินิก</p>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto min-h-10 rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
          >
            ปิดหน้าต่าง
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
