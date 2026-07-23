import React, { useState } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/gasScriptCode';
import Swal from 'sweetalert2';

interface GasScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GasScriptModal: React.FC<GasScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'คัดลอกโค้ด Google Apps Script แล้ว!',
      showConfirmButton: false,
      timer: 2000,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-code text-emerald-400"></i>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                โค้ด Google Apps Script (Code.gs)
              </h3>
              <p className="text-xs text-slate-500">
                v1_RDU_Clinics_Satun_Code.gs • พัฒนาโดย IT SSJ Satun 2569
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

        {/* Step by step guide */}
        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5 shrink-0">
          <div className="font-bold flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-emerald-600"></i>
            <span>ขั้นตอนการใช้งาน Google Apps Script กับ Google Sheets:</span>
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
            <li>สร้าง Google Sheets และตั้งชื่อ Sheet ย่อยตามอำเภอ: <strong className="font-semibold">เมือง, ท่าแพ, ละงู, ควนกาหลง, ควนโดน, ทุ่งหว้า, มะนัง</strong> และ <strong className="font-semibold">AuditLogs</strong></li>
            <li>ไปที่เมนู <strong className="font-semibold">Extensions &gt; Apps Script (ส่วนขยาย &gt; Apps Script)</strong></li>
            <li>คัดลอกโค้ดด้านล่างนี้ วางลงในไฟล์ <strong className="font-semibold">Code.gs</strong> แล้วกดบันทึก 💾</li>
            <li>กด <strong className="font-semibold">Deploy &gt; New deployment (นำออกเผยแพร่ &gt; การตั้งค่าทำให้ใช้งานได้ใหม่)</strong> เลือกประเภท Web app (แอปเว็บ)</li>
            <li>กำหนด <strong className="font-semibold">Execute as: Me</strong> และ <strong className="font-semibold">Who has access: Anyone</strong></li>
            <li>นำ Web App URL ที่ได้ มากรอกลงในเมนู <strong className="font-semibold">"ตั้งค่า"</strong> ของระบบ Dashboard นี้เพื่อเปิดใช้งานเรียลไทม์ 🚀</li>
          </ol>
        </div>

        {/* Code Content Container */}
        <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 p-4 font-mono text-xs text-emerald-400">
          <button
            onClick={handleCopyCode}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
            aria-label="คัดลอกโค้ดทั้งหมด"
          >
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
          </button>

          <pre className="overflow-auto h-80 pr-2 scrollbar-none text-[11px] leading-relaxed text-slate-200">
            {GOOGLE_APPS_SCRIPT_CODE}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex justify-end gap-2 shrink-0">
          <button
            onClick={handleCopyCode}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-2"
          >
            <i className="fa-solid fa-copy"></i>
            <span>คัดลอกโค้ดทั้งหมด</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
