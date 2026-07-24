import { useEffect, useMemo, useState, FormEvent } from 'react';
import Swal from 'sweetalert2';
import { AppUser } from '../types';
import { AuthProviderButtons } from './AuthProviderButtons';
import { registerOfficer } from '../services/userService';
import { sendOfficerRegistrationTelegramNotification, loadSettings } from '../services/api';

interface AdminLoginPageProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  onGoBackHome: () => void;
  initialMode?: 'login' | 'register';
  onUsersUpdated?: () => void;
}

type AuthStatus =
  | 'default'
  | 'success'
  | 'pending'
  | 'suspended'
  | 'access_denied'
  | 'expired'
  | 'configuration_error'
  | 'state_error'
  | 'provider_error'
  | 'cancelled';

const STATUS_CONTENT: Record<
  Exclude<AuthStatus, 'default' | 'success'>,
  { title: string; message: string; tone: string; icon: string }
> = {
  pending: {
    title: 'บัญชีกำลังรออนุมัติ',
    message:
      'ยืนยันตัวตนสำเร็จแล้ว แต่บัญชีนี้ยังไม่ได้รับสิทธิ์เจ้าหน้าที่ กรุณาส่งรหัสบัญชีให้ผู้ดูแลระบบอนุมัติ',
    tone: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'fa-clock',
  },
  suspended: {
    title: 'บัญชีถูกระงับ',
    message: 'กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบสถานะบัญชี',
    tone: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'fa-ban',
  },
  access_denied: {
    title: 'บัญชีนี้ยังไม่มีสิทธิ์',
    message: 'บัญชีผ่านการยืนยันตัวตนแล้ว แต่ไม่มีสิทธิ์เข้าพื้นที่เจ้าหน้าที่',
    tone: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'fa-lock',
  },
  expired: {
    title: 'เซสชันหมดอายุ',
    message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อความปลอดภัย',
    tone: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'fa-clock-rotate-left',
  },
  configuration_error: {
    title: 'การเชื่อมต่อยังตั้งค่าไม่ครบ',
    message:
      'ตัวแปรลับของผู้ให้บริการหรือ JWT_SECRET ใน Vercel Production ยังไม่ครบ กรุณาแจ้งผู้ดูแลระบบ',
    tone: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'fa-triangle-exclamation',
  },
  state_error: {
    title: 'เซสชันยืนยันตัวตนไม่ตรงกัน',
    message:
      'คุกกี้สำหรับการเข้าสู่ระบบอาจหมดอายุหรือถูกบล็อก กรุณาลองใหม่จากหน้านี้',
    tone: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'fa-shield-halved',
  },
  provider_error: {
    title: 'ผู้ให้บริการตอบกลับไม่สำเร็จ',
    message:
      'Google หรือ LINE ไม่สามารถยืนยันบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
    tone: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'fa-circle-exclamation',
  },
  cancelled: {
    title: 'ยกเลิกการเข้าสู่ระบบแล้ว',
    message: 'คุณสามารถเลือก Google หรือ LINE เพื่อเริ่มใหม่ได้ทันที',
    tone: 'border-slate-200 bg-slate-50 text-slate-800',
    icon: 'fa-circle-info',
  },
};

export function AdminLoginPage({
  currentUser,
  onLogout,
  onGoBackHome,
  initialMode = 'login',
  onUsersUpdated,
}: AdminLoginPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);
  const [status, setStatus] = useState<AuthStatus>('default');
  const [provider, setProvider] = useState<'google' | 'line' | null>(null);
  const [copied, setCopied] = useState(false);

  // Officer Registration Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [workGroup, setWorkGroup] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [phone, setPhone] = useState('');
  const [emailOrId, setEmailOrId] = useState('');
  const [regProvider, setRegProvider] = useState<'google' | 'line'>('google');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regSuccessUser, setRegSuccessUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth') as AuthStatus | null;
    const authProvider = params.get('provider');
    const modeParam = params.get('mode');
    const hasOauthResult = Boolean(authStatus || authProvider);

    if (modeParam === 'register') {
      setActiveTab('register');
    }

    if (
      authStatus &&
      [
        'success',
        'pending',
        'suspended',
        'access_denied',
        'expired',
        'configuration_error',
        'state_error',
        'provider_error',
        'cancelled',
      ].includes(authStatus)
    ) {
      setStatus(authStatus);
    }

    if (authProvider === 'google' || authProvider === 'line') {
      setProvider(authProvider);
    }

    if (hasOauthResult) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('auth');
      cleanUrl.searchParams.delete('provider');
      cleanUrl.searchParams.delete('mode');
      window.history.replaceState(
        {},
        document.title,
        `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
      );
    }
  }, []);

  const isActiveAdmin =
    currentUser?.status === 'active' &&
    (currentUser.role === 'admin' || currentUser.role === 'super_admin');

  const effectiveStatus: AuthStatus = isActiveAdmin ? 'success' : status;
  const referenceCode = useMemo(() => {
    const providerCode = (provider || currentUser?.provider || 'auth').toUpperCase();
    return `RDU-${providerCode}-${effectiveStatus.toUpperCase()}`;
  }, [currentUser?.provider, effectiveStatus, provider]);

  const copyLineId = async () => {
    if (!currentUser?.emailOrId) return;
    await navigator.clipboard.writeText(currentUser.emailOrId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!firstName.trim() || !lastName.trim() || !position.trim() || !workGroup.trim() || !affiliation.trim() || !phone.trim() || !emailOrId.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน ⚠️',
        text: 'โปรดกรอกข้อมูลชื่อ นามสกุล ตำแหน่ง กลุ่มงาน สังกัด เบอร์โทรศัพท์ และอีเมล/LINE ID',
        confirmButtonColor: '#059669',
      });
      setIsSubmitting(false);
      return;
    }

    const res = registerOfficer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      position: position.trim(),
      workGroup: workGroup.trim(),
      affiliation: affiliation.trim(),
      phone: phone.trim(),
      emailOrId: emailOrId.trim(),
      provider: regProvider,
    });

    setIsSubmitting(false);

    if (res.success && res.user) {
      setRegSuccessUser(res.user);
      onUsersUpdated?.();
      sendOfficerRegistrationTelegramNotification(res.user, loadSettings()).catch(() => {});
      Swal.fire({
        icon: 'success',
        title: 'ลงทะเบียนเจ้าหน้าที่สำเร็จ! 🎉',
        text: res.message,
        confirmButtonColor: '#059669',
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ลงทะเบียนไม่สำเร็จ ❌',
        text: res.message || 'เกิดข้อผิดพลาดในการลงทะเบียน',
        confirmButtonColor: '#e11d48',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Kanit',sans-serif] text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onGoBackHome}
            className="flex items-center gap-3 rounded-xl text-left focus:outline-none focus:ring-4 focus:ring-emerald-100"
            aria-label="กลับหน้าหลัก RDU Clinics Satun"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-xs font-black text-white">
              RDU
            </span>
            <span>
              <span className="block text-base font-bold sm:text-lg">
                RDU Clinics Satun
              </span>
              <span className="hidden text-sm text-slate-600 sm:block">
                สำนักงานสาธารณสุขจังหวัดสตูล
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onGoBackHome}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true" />
            กลับหน้าหลัก
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto grid min-h-[calc(100vh-77px)] max-w-7xl lg:grid-cols-[minmax(0,0.85fr)_minmax(540px,1.15fr)]">
        {/* Left Branding Sidebar */}
        <section className="hidden items-center justify-center bg-emerald-50 px-10 lg:flex">
          <div className="max-w-lg text-center">
            <span className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-700 text-4xl text-white shadow-xl shadow-emerald-900/15">
              <i className="fa-solid fa-user-shield" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-black leading-tight text-slate-950">
              ระบบติดตาม RDU Clinics จังหวัดสตูล
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              ระบบสำหรับเจ้าหน้าที่สาธารณสุขและบุคลากรผู้ดูแลระบบ
              ในการบันทึก ตรวจสอบ และอัปเดตผลประเมินคลินิกเอกชนอย่างปลอดภัย
            </p>
            <ul className="mt-8 space-y-3 text-left">
              {[
                'ลงทะเบียนเจ้าหน้าที่ด้วยข้อมูลตำแหน่ง สังกัด และเบอร์โทรศัพท์',
                'ยืนยันตัวตนรวดเร็วผ่าน Google หรือ LINE',
                'จำกัดสิทธิ์แก้ไขเฉพาะเจ้าหน้าที่ที่ได้รับการอนุมัติสิทธิ์',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/85 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                    <i className="fa-solid fa-check" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right Auth / Registration Form Box */}
        <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[540px] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
            
            {/* Logged in success view */}
            {effectiveStatus === 'success' && isActiveAdmin ? (
              <div role="status" aria-live="polite" className="text-center py-4">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
                  <i className="fa-solid fa-check" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-bold">เข้าสู่ระบบสำเร็จ</h2>
                <p className="mt-2 text-base text-slate-600">
                  ยินดีต้อนรับ {currentUser.name} ({currentUser.position || 'เจ้าหน้าที่'})
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {currentUser.workGroup} • {currentUser.affiliation}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={onGoBackHome}
                    className="min-h-12 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  >
                    ไปยังหน้าหลักระบบติดตาม
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Tab Switcher: เข้าสู่ระบบ VS ลงทะเบียนเจ้าหน้าที่ */}
                <div className="flex rounded-2xl bg-slate-100 p-1.5 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                      activeTab === 'login'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <i className="fa-solid fa-right-to-bracket text-emerald-600"></i>
                    <span>เข้าสู่ระบบเจ้าหน้าที่</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                      activeTab === 'register'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <i className="fa-solid fa-user-plus text-emerald-600"></i>
                    <span>ลงทะเบียนเจ้าหน้าที่</span>
                  </button>
                </div>

                {/* Status Alert Banner */}
                {effectiveStatus !== 'default' &&
                  effectiveStatus !== 'success' && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className={`mb-6 rounded-xl border p-4 ${
                        STATUS_CONTENT[effectiveStatus].tone
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <i
                          className={`fa-solid ${
                            STATUS_CONTENT[effectiveStatus].icon
                          } mt-1 text-lg`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold">
                            {STATUS_CONTENT[effectiveStatus].title}
                          </h3>
                          <p className="mt-1 text-sm leading-6">
                            {STATUS_CONTENT[effectiveStatus].message}
                          </p>
                          <p className="mt-2 text-xs font-medium opacity-80">
                            รหัสอ้างอิง: {referenceCode}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStatus('default');
                            setProvider(null);
                          }}
                          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-current opacity-70 transition hover:bg-black/5 hover:opacity-100"
                          aria-label="ปิดข้อความแจ้งเตือน"
                        >
                          <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}

                {/* LINE ID Copy Widget if pending */}
                {effectiveStatus === 'pending' &&
                  currentUser?.provider === 'line' &&
                  currentUser.emailOrId && (
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">
                        LINE User ID สำหรับแจ้งสิทธิ์
                      </p>
                      <code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs text-slate-700">
                        {currentUser.emailOrId}
                      </code>
                      <button
                        type="button"
                        onClick={copyLineId}
                        className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100"
                      >
                        {copied ? 'คัดลอกแล้ว' : 'คัดลอก LINE User ID'}
                      </button>
                    </div>
                  )}

                {/* TAB 1: LOGIN VIEW */}
                {activeTab === 'login' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                        เข้าสู่ระบบเจ้าหน้าที่
                      </h2>
                      <p className="mt-1.5 text-sm text-slate-600">
                        เลือกบัญชี Google หรือ LINE ที่ได้รับการอนุมัติสิทธิ์จากผู้ดูแลระบบ
                      </p>
                    </div>

                    <AuthProviderButtons
                      onStart={(selectedProvider) => setProvider(selectedProvider)}
                    />

                    <div className="flex items-start gap-3 rounded-xl bg-slate-100 p-4 text-xs sm:text-sm leading-6 text-slate-600">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                      </span>
                      <p>
                        ยังไม่มีบัญชีเจ้าหน้าที่? เลือกหัวข้อ <b>"ลงทะเบียนเจ้าหน้าที่"</b>{' '}
                        เพื่อแจ้งข้อมูลตำแหน่ง สังกัด และขอรับสิทธิ์เข้าใช้งาน
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: REGISTER VIEW */}
                {activeTab === 'register' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                        ลงทะเบียนเจ้าหน้าที่ใหม่
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600">
                        กรอกข้อมูลประจำตัวเจ้าหน้าที่เพื่อขออนุมัติสิทธิ์เข้าอัปเดตข้อมูล RDU คลินิกเอกชน
                      </p>
                    </div>

                    {/* Show Registration Success Card */}
                    {regSuccessUser ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-lg">
                            <i className="fa-solid fa-check" aria-hidden="true" />
                          </span>
                          <div>
                            <h3 className="font-bold text-base text-emerald-900">ลงทะเบียนสำเร็จ!</h3>
                            <p className="text-xs text-emerald-700">สถานะ: รอการอนุมัติสิทธิ์จาก Super Admin</p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-white p-4 text-xs space-y-2 border border-emerald-100 text-slate-700">
                          <div><span className="font-bold text-slate-900">ชื่อ-นามสกุล:</span> {regSuccessUser.name}</div>
                          <div><span className="font-bold text-slate-900">ตำแหน่ง:</span> {regSuccessUser.position}</div>
                          <div><span className="font-bold text-slate-900">กลุ่มงาน:</span> {regSuccessUser.workGroup}</div>
                          <div><span className="font-bold text-slate-900">สังกัด:</span> {regSuccessUser.affiliation}</div>
                          <div><span className="font-bold text-slate-900">เบอร์โทรศัพท์:</span> {regSuccessUser.phone}</div>
                          <div><span className="font-bold text-slate-900">บัญชี/อีเมล:</span> {regSuccessUser.emailOrId} ({regSuccessUser.provider.toUpperCase()})</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRegSuccessUser(null);
                            setActiveTab('login');
                          }}
                          className="w-full py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
                        >
                          กลับไปหน้าเข้าสู่ระบบ
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        {/* Name & Surname Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">
                              ชื่อ <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="เช่น เอกภรณ์"
                              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">
                              นามสกุล <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="เช่น สุวรรณฉวี"
                              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                          </div>
                        </div>

                        {/* Position */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">
                            ตำแหน่ง <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            placeholder="เช่น ภก.ชำนาญการ / นักวิชาการสาธารณสุข"
                            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                        </div>

                        {/* Work Group & Affiliation Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">
                              กลุ่มงาน <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={workGroup}
                              onChange={(e) => setWorkGroup(e.target.value)}
                              placeholder="เช่น กลุ่มงานเภสัชกรรมฯ"
                              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">
                              สังกัด <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={affiliation}
                              onChange={(e) => setAffiliation(e.target.value)}
                              placeholder="เช่น สสจ.สตูล / รพ.สต."
                              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">
                            เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="เช่น 081-234-5678"
                            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                        </div>

                        {/* Email or LINE ID & Provider Choice */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-700">
                              อีเมล (Gmail) หรือ LINE ID <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={emailOrId}
                              onChange={(e) => setEmailOrId(e.target.value)}
                              placeholder="เช่น officer@gmail.com"
                              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">
                              ช่องทางยืนยันตัวตน
                            </label>
                            <select
                              value={regProvider}
                              onChange={(e) => setRegProvider(e.target.value as 'google' | 'line')}
                              className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
                            >
                              <option value="google">Google (Gmail)</option>
                              <option value="line">LINE</option>
                            </select>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full min-h-12 rounded-xl bg-emerald-700 px-4 font-bold text-white shadow-md transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                          <span>ส่งข้อมูลลงทะเบียนเจ้าหน้าที่</span>
                        </button>

                        {/* Divider */}
                        <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-3 text-slate-500 font-medium">
                              หรือลงทะเบียนผ่าน Social OAuth
                            </span>
                          </div>
                        </div>

                        <AuthProviderButtons
                          onStart={(selectedProvider) => setProvider(selectedProvider)}
                        />
                      </form>
                    )}
                  </div>
                )}

                {/* Footer note */}
                <p className="mt-6 text-center text-xs text-slate-500">
                  มีปัญหาในการลงทะเบียนหรือเข้าสู่ระบบ?{' '}
                  <a
                    href="mailto:satun.rdu.admin@gmail.com"
                    className="font-semibold text-emerald-700 underline-offset-4 hover:underline"
                  >
                    ติดต่อผู้ดูแลระบบ
                  </a>
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

