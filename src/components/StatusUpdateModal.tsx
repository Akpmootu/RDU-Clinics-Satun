import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Clinic, AssessmentStatus, SettingsConfig } from '../types';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: Clinic | null;
  allClinics: Clinic[];
  onSave: (
    clinic: Clinic,
    newStatus: AssessmentStatus,
    newLevel: number | null,
    editedBy: string,
    remarks: string
  ) => Promise<boolean>;
  settings: SettingsConfig;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  clinic,
  allClinics,
  onSave,
}) => {
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatus>('ประเมินแล้ว');
  const [assessmentLevel, setAssessmentLevel] = useState<number | null>(2);
  const [editedBy, setEditedBy] = useState<string>('ภก.นิเวศน์ (ทีมงาน IT SSJ Satun)');
  const [remarks, setRemarks] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [shakeError, setShakeError] = useState<boolean>(false);

  // Synchronize initial modal state when clinic prop changes
  useEffect(() => {
    if (clinic) {
      setSelectedClinicId(clinic.id);
      setAssessmentStatus(clinic.assessmentStatus);
      setAssessmentLevel(clinic.assessmentLevel ?? 2);
      setRemarks(clinic.remarks || '');
    } else if (allClinics.length > 0) {
      setSelectedClinicId(allClinics[0].id);
    }
  }, [clinic, allClinics]);

  if (!isOpen) return null;

  const currentClinic = allClinics.find((c) => c.id === selectedClinicId) || clinic;

  // PIN strength calculator (แดง -> เหลือง -> เขียว)
  const getPinStrength = () => {
    if (!pin) return { text: 'ยังไม่ได้ระบุ', color: 'bg-slate-200', pct: 0 };
    if (pin.length < 4) return { text: 'รหัสผ่านสั้นไป', color: 'bg-rose-500', pct: 33 };
    if (pin.length >= 4 && pin.length < 6) return { text: 'ความปลอดภัยปานกลาง', color: 'bg-amber-500', pct: 66 };
    return { text: 'ปลอดภัยสูง', color: 'bg-emerald-500', pct: 100 };
  };

  const strength = getPinStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClinic) return;

    if (!editedBy.trim()) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      Swal.fire({
        icon: 'error',
        title: 'กรุณาระบุชื่อผู้บันทึกข้อมูล',
        text: 'เพื่อบันทึกประวัติความโปร่งใสในระบบ Audit Log',
        confirmButtonColor: '#059669',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const telegramSent = await onSave(
        currentClinic,
        assessmentStatus,
        assessmentStatus === 'ประเมินแล้ว' ? assessmentLevel : null,
        editedBy,
        remarks
      );

      setIsSubmitting(false);

      Swal.fire({
        icon: telegramSent ? 'success' : 'warning',
        titleText: 'บันทึกผลการประเมินสำเร็จ',
        text: [
          `คลินิก: ${currentClinic.name}`,
          `อำเภอ: ${currentClinic.district}`,
          `สถานะ: ${assessmentStatus}`,
          `ระดับ: ${assessmentLevel ? `ระดับ ${assessmentLevel}` : 'ยังไม่กำหนด'}`,
          telegramSent
            ? 'ระบบบันทึก Audit Log และส่ง Telegram เรียบร้อยแล้ว'
            : 'บันทึกข้อมูลแล้ว แต่ส่ง Telegram ไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ',
        ].join('\n'),
        confirmButtonColor: '#059669',
        confirmButtonText: 'ตกลง',
      });

      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      const errorMessage = err instanceof Error ? err.message : String(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการบันทึก',
        text: errorMessage || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: '#059669',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300">
      <div
        className={`bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 transform transition-all duration-300 animate-fadeIn overflow-y-auto max-h-[90vh] ${
          shakeError ? 'animate-shake' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                บันทึก / อัปเดตผลการประเมิน RDU
              </h3>
              <p className="text-xs text-slate-500">
                แบบฟอร์มประเมินตนเองคลินิกเอกชน จังหวัดสตูล
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="ปิดหน้าต่าง"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Clinic Selector Floating Label */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              เลือกคลินิกเอกชนที่ต้องการประเมิน:
            </label>
            <select
              value={selectedClinicId}
              onChange={(e) => {
                setSelectedClinicId(e.target.value);
                const found = allClinics.find((c) => c.id === e.target.value);
                if (found) {
                  setAssessmentStatus(found.assessmentStatus);
                  setAssessmentLevel(found.assessmentLevel ?? 2);
                  setRemarks(found.remarks || '');
                }
              }}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            >
              {allClinics.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.district}] {c.name} ({c.licensee})
                </option>
              ))}
            </select>
          </div>

          {/* Current Selected Clinic Card Details */}
          {currentClinic && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-sm">{currentClinic.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-semibold">
                  อำเภอ{currentClinic.district}
                </span>
              </div>
              <p className="text-emerald-800">
                <strong>ประเภท:</strong> {currentClinic.type} | <strong>ผู้รับอนุญาต:</strong> {currentClinic.licensee}
              </p>
            </div>
          )}

          {/* Assessment Status Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              สถานะการประเมิน RDU:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAssessmentStatus('ประเมินแล้ว')}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                  assessmentStatus === 'ประเมินแล้ว'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-circle-check text-lg"></i>
                <div>
                  <span className="block font-bold text-xs">ประเมินแล้ว</span>
                  <span className="block text-[10px] opacity-80">มีผลการประเมิน RDU</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAssessmentStatus('รอประเมิน')}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                  assessmentStatus === 'รอประเมิน'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-hourglass-half text-lg"></i>
                <div>
                  <span className="block font-bold text-xs">รอประเมิน</span>
                  <span className="block text-[10px] opacity-80">ยังไม่เข้าประเมิน</span>
                </div>
              </button>
            </div>
          </div>

          {/* Assessment Level Selector (Visible when 'ประเมินแล้ว') */}
          {assessmentStatus === 'ประเมินแล้ว' && (
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700">
                เลือกระดับผลการประเมิน RDU (Level):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 3, label: 'ระดับ 3 (3 ดาว)', desc: 'ผ่านเกณฑ์ดีเยี่ยม', color: 'emerald' },
                  { level: 2, label: 'ระดับ 2 (2 ดาว)', desc: 'ผ่านเกณฑ์มาตรฐาน', color: 'teal' },
                  { level: 1, label: 'ระดับ 1 (1 ดาว)', desc: 'ต้องปรับปรุง', color: 'amber' },
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setAssessmentLevel(item.level)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      assessmentLevel === item.level
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-extrabold text-xs">{item.label}</span>
                    <span className="block text-[10px] opacity-75">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor Name Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              ชื่อผู้บันทึกข้อมูล / เจ้าหน้าที่ประเมิน: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editedBy}
              onChange={(e) => setEditedBy(e.target.value)}
              placeholder="เช่น ภก.นิเวศน์ / ทีมประเมิน สสจ.สตูล"
              required
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Security PIN & Password Strength Meter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              รหัสผ่านยืนยันตัวตน (PIN Security):
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="ระบุ PIN ยืนยัน (เช่น 123456)"
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
            
            {/* Password Strength Meter */}
            {pin && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                  <span>ความแข็งแกร่งรหัสผ่าน:</span>
                  <span className="text-slate-800">{strength.text}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.pct}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Remarks Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              หมายเหตุเพิ่มเติม (ถ้ามี):
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="ระบุหมายเหตุ เช่น ผ่านเกณฑ์ RDU มีป้ายสัญลักษณ์..."
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>บันทึกผลการประเมิน</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
