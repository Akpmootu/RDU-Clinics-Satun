import React, { useState } from 'react';
import Swal from 'sweetalert2';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Default PIN: "2569" or "1234"
    if (pin.trim() === '2569' || pin.trim() === '1234') {
      setErrorMsg('');
      setPin('');
      onLoginSuccess();
      Swal.fire({
        icon: 'success',
        title: 'เข้าสู่ระบบแอดมินสำเร็จ! 🔐',
        text: 'ยินดีต้อนรับ เจ้าหน้าที่/แอดมิน ท่านสามารถจัดการข้อมูล ประเมิน และตั้งค่าระบบได้แล้ว',
        confirmButtonColor: '#059669',
      });
      onClose();
    } else {
      setErrorMsg('รหัส PIN ไม่ถูกต้อง (รหัสเริ่มต้นคือ: 2569)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-600/30">
              <i className="fa-solid fa-user-shield text-lg"></i>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                เข้าสู่ระบบสำหรับแอดมิน (Admin)
              </h3>
              <p className="text-xs text-slate-500">
                กรอกรหัส PIN เพื่อเข้าใช้งานส่วนจัดการข้อมูล RDU
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              <i className="fa-solid fa-key text-emerald-600 mr-1.5"></i>
              รหัสผ่าน / PIN เจ้าหน้าที่ (Default: 2569):
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErrorMsg('');
              }}
              placeholder="กรอกรหัส PIN (เช่น 2569)"
              className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              autoFocus
              maxLength={10}
            />
            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-circle-info text-emerald-600"></i>
              <span>สิทธิ์การใช้งานสำหรับแอดมิน:</span>
            </p>
            <ul className="list-disc list-inside text-[11px] text-emerald-700 space-y-0.5 pl-1">
              <li>อัปเดตและบันทึกคะแนนผลการประเมิน RDU</li>
              <li>เชื่อมต่อ Google Apps Script & Google Sheets</li>
              <li>ตั้งค่า Telegram Admin Notification</li>
              <li>ดูประวัติการบันทึก (Audit Trail Logs)</li>
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              <span>เข้าสู่ระบบ Admin</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
