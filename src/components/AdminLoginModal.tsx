import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { AppUser } from '../types';
import { validateLogin, SUPER_ADMIN_EMAIL, maskIdentifier } from '../services/userService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'select' | 'google' | 'line'>('select');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customLineId, setCustomLineId] = useState('');
  const [customLineName, setCustomLineName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleStep, setGoogleStep] = useState<'picker' | 'verify'>('picker');

  if (!isOpen) return null;

  const handleResetModal = () => {
    setAuthMode('select');
    setCustomEmail('');
    setCustomName('');
    setCustomLineId('');
    setCustomLineName('');
    setLoading(false);
    setGoogleStep('picker');
  };

  const handleClose = () => {
    handleResetModal();
    onClose();
  };

  const processLogin = (emailOrId: string, provider: 'google' | 'line', customDisplayName?: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const result = validateLogin(emailOrId, provider);

      if (!result.success) {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถเข้าสู่ระบบได้! ❌',
          text: result.message || `ไม่พบสิทธิ์การใช้งานสำหรับบัญชีนี้`,
          confirmButtonColor: '#e11d48',
          confirmButtonText: 'รับทราบ',
        });
        return;
      }

      const loggedInUser: AppUser = {
        ...result.user!,
        name: customDisplayName || result.user!.name,
      };

      onLoginSuccess(loggedInUser);

      const isSuper = loggedInUser.role === 'super_admin';
      Swal.fire({
        icon: 'success',
        title: `ยินดีต้อนรับคุณ ${loggedInUser.name}! 🎉`,
        html: `
          <div class="space-y-2 text-sm text-slate-600">
            <p>เข้าสู่ระบบสำเร็จในสิทธิ์: <b class="text-emerald-700">${isSuper ? 'Super Admin (ผู้ดูแลระบบสูงสุด)' : 'Admin (เจ้าหน้าที่)'}</b></p>
            <p class="text-xs text-slate-400">ยืนยันตัวตนผ่าน: ${provider.toUpperCase()} Account</p>
          </div>
        `,
        confirmButtonColor: '#059669',
        confirmButtonText: 'ตกลง เข้าสู่ระบบ',
      });

      handleClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden transition-all">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xl font-bold shadow-inner">
              <i className="fa-solid fa-user-shield text-emerald-300"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                เข้าสู่ระบบแอดมิน (Admin Login)
              </h3>
              <p className="text-xs text-emerald-100">
                ยืนยันตัวตนด้วย Google หรือ LINE Account
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition focus:outline-none"
            aria-label="ปิดหน้าต่าง"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {/* MODE SELECT: Chooser Buttons */}
          {authMode === 'select' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-slate-700 space-y-1">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                  <span>ข้อกำหนดความปลอดภัยและความเป็นส่วนตัว:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  ระบบรักษาความปลอดภัย RDU สตูล ซ่อนข้อมูลอีเมลเพื่อป้องกันการดักจับข้อมูล กรุณาเลือกยืนยันตัวตนผ่านบัญชีแอดมินของคุณ
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Google Sign-in Button */}
                <button
                  onClick={() => setAuthMode('google')}
                  className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 shadow-xs hover:shadow-md transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition">
                      <i className="fa-brands fa-google"></i>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-rose-700">
                        เข้าสู่ระบบด้วย Google Account
                      </div>
                      <div className="text-xs text-slate-500">
                        ยืนยันผ่านระบบบัญชี Google (Gmail)
                      </div>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400 group-hover:text-rose-600"></i>
                </button>

                {/* LINE Sign-in Button */}
                <button
                  onClick={() => setAuthMode('line')}
                  className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 shadow-xs hover:shadow-md transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold group-hover:scale-110 transition">
                      <i className="fa-brands fa-line"></i>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                        เข้าสู่ระบบด้วย LINE Account
                      </div>
                      <div className="text-xs text-slate-500">
                        ยืนยันผ่านระบบบัญชีแอปพลิเคชัน LINE
                      </div>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400 group-hover:text-emerald-600"></i>
                </button>
              </div>

              <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-lock text-emerald-600"></i>
                <span>ระบบคุ้มครองข้อมูลส่วนบุคคล (PDPA Compliant)</span>
              </div>
            </div>
          )}

          {/* GOOGLE AUTH FORM */}
          {authMode === 'google' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <i className="fa-brands fa-google text-xs"></i>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">เลือกบัญชี Google Account</h4>
                </div>
                <button
                  onClick={() => setAuthMode('select')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  <i className="fa-solid fa-arrow-left mr-1"></i>เปลี่ยนวิธี
                </button>
              </div>

              {/* Direct OAuth Redirect Button */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-rose-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>ต้องการล็อกอินผ่าน Google OAuth Direct?</span>
                </div>
                <a
                  href="/api/auth/google"
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs text-center block"
                >
                  <i className="fa-brands fa-google"></i>
                  <span>เชื่อมต่อไปยัง Google OAuth 2.0</span>
                </a>
              </div>

              {/* Quick Select Preset Google Accounts (Privacy Masked) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  บัญชีแอดมินที่ลงทะเบียน ( Google Sign-In ):
                </label>

                {/* Super Admin Preset */}
                <button
                  type="button"
                  onClick={() => processLogin(SUPER_ADMIN_EMAIL, 'google')}
                  disabled={loading}
                  className="w-full p-3 rounded-2xl bg-amber-50/80 border border-amber-200 hover:border-amber-400 hover:bg-amber-100/80 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Akaporn</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-slate-900">
                          Super Admin
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {maskIdentifier(SUPER_ADMIN_EMAIL)}
                      </div>
                    </div>
                  </div>
                  <i className="fa-solid fa-right-to-bracket text-amber-700 text-sm group-hover:translate-x-1 transition"></i>
                </button>

                {/* Staff Admin Preset */}
                <button
                  type="button"
                  onClick={() => processLogin('satun.rdu.admin@gmail.com', 'google')}
                  disabled={loading}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      S
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>เจ้าหน้าที่ สสจ.สตูล</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Admin
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {maskIdentifier('satun.rdu.admin@gmail.com')}
                      </div>
                    </div>
                  </div>
                  <i className="fa-solid fa-right-to-bracket text-slate-400 group-hover:text-emerald-700 text-sm group-hover:translate-x-1 transition"></i>
                </button>
              </div>

              {/* Custom Gmail Input */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  หรือยืนยันด้วยบัญชี Google อื่นๆ:
                </label>
                
                <div className="space-y-2">
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="ป้อนบัญชี Google (Gmail)"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="ระบุชื่อ-นามสกุล หรือตำแหน่งผู้ใช้งาน"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={!customEmail.trim() || loading}
                  onClick={() => processLogin(customEmail.trim(), 'google', customName.trim())}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>กำลังยืนยันบัญชี Google...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-brands fa-google"></i>
                      <span>ยืนยันตัวตนด้วย Google</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* LINE AUTH FORM */}
          {authMode === 'line' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <i className="fa-brands fa-line text-xs"></i>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">เลือกบัญชี LINE Account</h4>
                </div>
                <button
                  onClick={() => setAuthMode('select')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  <i className="fa-solid fa-arrow-left mr-1"></i>เปลี่ยนวิธี
                </button>
              </div>

              {/* Direct LINE OAuth Redirect Button */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>ต้องการล็อกอินผ่าน LINE Login Direct?</span>
                </div>
                <a
                  href="/api/auth/line"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs text-center block"
                >
                  <i className="fa-brands fa-line"></i>
                  <span>เชื่อมต่อไปยัง LINE Login 2.1</span>
                </a>
              </div>

              {/* Preset LINE Accounts */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  บัญชี LINE ที่ลงทะเบียนไว้ ( LINE Sign-In ):
                </label>

                <button
                  type="button"
                  onClick={() => processLogin('satun_rdu_line', 'line')}
                  disabled={loading}
                  className="w-full p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/80 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      L
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>LINE Admin Satun</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-200 text-emerald-900">
                          Admin
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono">
                        {maskIdentifier('satun_rdu_line')}
                      </div>
                    </div>
                  </div>
                  <i className="fa-solid fa-right-to-bracket text-emerald-700 text-sm group-hover:translate-x-1 transition"></i>
                </button>
              </div>

              {/* Custom LINE ID Input */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  หรือล็อกอินด้วย LINE ID อื่นๆ:
                </label>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customLineId}
                    onChange={(e) => setCustomLineId(e.target.value)}
                    placeholder="ป้อน LINE ID"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <input
                    type="text"
                    value={customLineName}
                    onChange={(e) => setCustomLineName(e.target.value)}
                    placeholder="ระบุชื่อแสดงผลใน LINE"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={!customLineId.trim() || loading}
                  onClick={() => processLogin(customLineId.trim(), 'line', customLineName.trim())}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>กำลังยืนยันบัญชี LINE...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-brands fa-line"></i>
                      <span>ยืนยันตัวตนด้วย LINE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>ต้องการเพิ่มสิทธิ์? ติดต่อ Super Admin</span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};

