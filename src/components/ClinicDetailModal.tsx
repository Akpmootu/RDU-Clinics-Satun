import React from 'react';
import { Clinic } from '../types';

interface ClinicDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: Clinic | null;
  userRole: 'admin' | 'user';
  onOpenEditModal: (clinic: Clinic) => void;
  onOpenAdminLogin: () => void;
}

export const ClinicDetailModal: React.FC<ClinicDetailModalProps> = ({
  isOpen,
  onClose,
  clinic,
  userRole,
  onOpenEditModal,
  onOpenAdminLogin,
}) => {
  if (!isOpen || !clinic) return null;

  const isPassed = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md ${
              clinic.assessmentStatus === 'ประเมินแล้ว'
                ? isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <i className="fa-solid fa-clinic-medical"></i>
            </div>
            <div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 mb-1">
                อำเภอ{clinic.district}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                {clinic.name}
              </h3>
              <p className="text-xs text-slate-500">
                ประเภท: {clinic.type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="ปิด"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Status Score Highlight Card */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          clinic.assessmentStatus === 'ประเมินแล้ว'
            ? isPassed
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}>
          <div>
            <span className="block text-xs font-bold opacity-80">
              สถานะผลการประเมิน RDU
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-extrabold">
                {clinic.assessmentStatus}
              </span>
              {clinic.assessmentLevel !== null && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-white shadow-xs border border-current">
                  ระดับ {clinic.assessmentLevel} ⭐
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="block text-[11px] font-semibold opacity-75">
              เกณฑ์ผ่าน (≥ ระดับ 2)
            </span>
            <span className={`inline-block mt-1 px-3 py-1 rounded-xl text-xs font-bold ${
              isPassed
                ? 'bg-emerald-600 text-white shadow-xs'
                : clinic.assessmentStatus === 'ประเมินแล้ว'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-amber-500 text-white shadow-xs'
            }`}>
              {clinic.passCriteria}
            </span>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <i className="fa-solid fa-id-card text-emerald-600"></i>
              ผู้รับอนุญาต:
            </span>
            <span className="font-bold text-slate-900 text-right">{clinic.licensee || '-'}</span>
          </div>

          <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <i className="fa-solid fa-location-dot text-emerald-600"></i>
              ที่อยู่ / ทำเลที่ตั้ง:
            </span>
            <span className="font-medium text-slate-800 text-right">{clinic.address || `อำเภอ${clinic.district} จังหวัดสตูล`}</span>
          </div>

          {clinic.updatedAt && (
            <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-clock text-emerald-600"></i>
                อัปเดตล่าสุด:
              </span>
              <span className="font-medium text-slate-800">{clinic.updatedAt} น.</span>
            </div>
          )}

          {clinic.updatedBy && (
            <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-user text-emerald-600"></i>
                ผู้ประเมิน / ผู้บันทึก:
              </span>
              <span className="font-medium text-slate-800">{clinic.updatedBy}</span>
            </div>
          )}

          <div className="pt-1">
            <span className="text-slate-500 font-semibold block mb-1 flex items-center gap-1.5">
              <i className="fa-solid fa-note-sticky text-emerald-600"></i>
              หมายเหตุ / บันทึกเพิ่มเติม:
            </span>
            <p className="p-2.5 rounded-xl bg-white border border-slate-200 font-medium text-slate-700 text-xs">
              {clinic.remarks || 'ไม่มีบันทึกเพิ่มเติม'}
            </p>
          </div>
        </div>

        {/* Footer Actions depending on Role */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
          >
            ปิดหน้าต่าง
          </button>

          {userRole === 'admin' ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditModal(clinic);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              <i className="fa-solid fa-pen-to-square text-emerald-400"></i>
              <span>แก้ไข / บันทึกผลประเมิน</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminLogin();
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-2"
            >
              <i className="fa-solid fa-user-shield text-emerald-600"></i>
              <span>เข้าสู่ระบบ Admin เพื่อแก้ไขข้อมูล</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
