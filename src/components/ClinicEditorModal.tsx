import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssessmentStatus, Clinic, DistrictName } from '../types';
import { SATUN_DISTRICTS } from '../data/initialData';

interface ClinicEditorModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  clinic: Clinic | null;
  onClose: () => void;
  onSave: (clinic: Partial<Clinic>) => Promise<void>;
}

const EMPTY_FORM: Partial<Clinic> = {
  district: 'เมือง',
  name: '',
  type: 'คลินิกเวชกรรม',
  licensee: '',
  address: '',
  phone: '',
  latitude: null,
  longitude: null,
  businessStatus: 'เปิดดำเนินการ',
  businessStatusNote: '',
  fiscalYear: 2569,
  assessmentStatus: 'รอประเมิน',
  assessmentLevel: null,
  passCriteria: 'รอการประเมิน',
  assessmentDate: '',
  remarks: '',
};

const fieldClass = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10';
const labelClass = 'text-xs font-bold text-slate-600';

export const ClinicEditorModal: React.FC<ClinicEditorModalProps> = ({
  isOpen,
  mode,
  clinic,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<Clinic>>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(mode === 'edit' && clinic ? { ...EMPTY_FORM, ...clinic } : { ...EMPTY_FORM });
  }, [clinic, isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), button:not([disabled])')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const setValue = <K extends keyof Clinic>(key: K, value: Clinic[K] | undefined) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleStatusChange = (status: AssessmentStatus) => {
    setForm((current) => ({
      ...current,
      assessmentStatus: status,
      assessmentLevel: status === 'ประเมินแล้ว' ? current.assessmentLevel ?? 2 : null,
      passCriteria:
        status === 'ประเมินแล้ว'
          ? (current.assessmentLevel ?? 2) >= 2
            ? 'ผ่าน'
            : 'ไม่ผ่าน'
          : 'รอการประเมิน',
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name?.trim() || !form.licensee?.trim() || !form.district) return;
    setIsSubmitting(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        licensee: form.licensee.trim(),
        address: form.address?.trim(),
        phone: form.phone?.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinic-editor-title"
        className="max-h-[96dvh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-slate-50 shadow-2xl sm:max-h-[92vh] sm:rounded-[2rem]"
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300 shadow-lg shadow-slate-950/15">
                <i className={`fa-solid ${mode === 'create' ? 'fa-plus' : 'fa-hospital-user'}`}></i>
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Clinic Registry</p>
                <h2 id="clinic-editor-title" className="font-display text-lg font-bold text-slate-950 sm:text-xl">
                  {mode === 'create' ? 'เพิ่มคลินิกเข้าสู่ทะเบียน' : 'แก้ไขข้อมูลคลินิกและผลประเมิน'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">ข้อมูลจะอัปเดต ClinicRegistry และ Assessments ด้วย clinicId เดียวกัน</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="ปิดหน้าต่าง">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </header>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>ชื่อสถานพยาบาล *</label>
              <input aria-label="ชื่อสถานพยาบาล" className={fieldClass} value={form.name || ''} onChange={(e) => setValue('name', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>อำเภอ *</label>
              <select aria-label="อำเภอ" className={fieldClass} value={form.district} onChange={(e) => setValue('district', e.target.value as DistrictName)}>
                {SATUN_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>ประเภทคลินิก *</label>
              <input aria-label="ประเภทคลินิก" className={fieldClass} value={form.type || ''} onChange={(e) => setValue('type', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>ผู้รับอนุญาต *</label>
              <input aria-label="ผู้รับอนุญาต" className={fieldClass} value={form.licensee || ''} onChange={(e) => setValue('licensee', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>โทรศัพท์</label>
              <input aria-label="โทรศัพท์" className={fieldClass} value={form.phone || ''} onChange={(e) => setValue('phone', e.target.value)} inputMode="tel" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>ที่อยู่</label>
              <input aria-label="ที่อยู่" className={fieldClass} value={form.address || ''} onChange={(e) => setValue('address', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Latitude</label>
              <input aria-label="Latitude" className={fieldClass} type="number" step="any" value={form.latitude ?? ''} onChange={(e) => setValue('latitude', e.target.value === '' ? null : Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input aria-label="Longitude" className={fieldClass} type="number" step="any" value={form.longitude ?? ''} onChange={(e) => setValue('longitude', e.target.value === '' ? null : Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>สถานะกิจการ</label>
              <select aria-label="สถานะกิจการ" className={fieldClass} value={form.businessStatus || 'เปิดดำเนินการ'} onChange={(e) => setValue('businessStatus', e.target.value)}>
                <option value="เปิดดำเนินการ">เปิดดำเนินการ</option>
                <option value="พักใช้">พักใช้</option>
                <option value="ปิดกิจการ">ปิดกิจการ</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>หมายเหตุสถานะกิจการ</label>
              <input aria-label="หมายเหตุสถานะกิจการ" className={fieldClass} value={form.businessStatusNote || ''} onChange={(e) => setValue('businessStatusNote', e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>ปีงบประมาณ {mode === 'edit' && <span className="font-normal text-slate-400">(แก้ไขไม่ได้)</span>}</label>
              <input aria-label="ปีงบประมาณ" className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`} type="number" min="2500" max="2700" value={form.fiscalYear || 2569} onChange={(e) => setValue('fiscalYear', Number(e.target.value))} disabled={mode === 'edit'} />
            </div>
            <div>
              <label className={labelClass}>สถานะประเมิน</label>
              <select aria-label="สถานะประเมิน" className={fieldClass} value={form.assessmentStatus} onChange={(e) => handleStatusChange(e.target.value as AssessmentStatus)}>
                <option value="รอประเมิน">รอประเมิน</option>
                <option value="ยังไม่ประเมิน">ยังไม่ประเมิน</option>
                <option value="ประเมินแล้ว">ประเมินแล้ว</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>ระดับผลประเมิน</label>
              <select
                aria-label="ระดับผลประเมิน"
                className={fieldClass}
                value={form.assessmentLevel ?? ''}
                disabled={form.assessmentStatus !== 'ประเมินแล้ว'}
                onChange={(e) => {
                  const level = e.target.value === '' ? null : Number(e.target.value);
                  setForm((current) => ({ ...current, assessmentLevel: level, passCriteria: level === null ? 'รอการประเมิน' : level >= 2 ? 'ผ่าน' : 'ไม่ผ่าน' }));
                }}
              >
                <option value="">ยังไม่ระบุ</option>
                <option value="1">ระดับ 1 — ต้องปรับปรุง</option>
                <option value="2">ระดับ 2 — ผ่านเกณฑ์</option>
                <option value="3">ระดับ 3 — ดีเยี่ยม</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>วันที่ประเมิน</label>
              <input aria-label="วันที่ประเมิน" className={fieldClass} type="date" value={(form.assessmentDate || '').slice(0, 10)} onChange={(e) => setValue('assessmentDate', e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className={labelClass}>หมายเหตุการประเมิน</label>
              <textarea aria-label="หมายเหตุการประเมิน" className={`${fieldClass} min-h-24 py-3`} value={form.remarks || ''} onChange={(e) => setValue('remarks', e.target.value)} />
            </div>
          </div>

          <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 pt-4 backdrop-blur sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-100">ยกเลิก</button>
            <button type="submit" disabled={isSubmitting} className="min-h-11 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>กำลังบันทึก</> : <><i className="fa-solid fa-floppy-disk mr-2 text-emerald-300"></i>{mode === 'create' ? 'เพิ่มคลินิก' : 'บันทึกการเปลี่ยนแปลง'}</>}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
};
