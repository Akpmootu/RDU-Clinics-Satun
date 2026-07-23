import { useEffect, useMemo, useState } from 'react';
import { AppUser } from '../types';
import { AuthProviderButtons } from './AuthProviderButtons';

interface AdminLoginPageProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  onGoBackHome: () => void;
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
      'ยืนยันตัวตนสำเร็จแล้ว แต่บัญชีนี้ยังไม่ได้รับสิทธิ์เจ้าหน้าที่ กรุณาส่งรหัสบัญชีให้ผู้ดูแลระบบ',
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
}: AdminLoginPageProps) {
  const [status, setStatus] = useState<AuthStatus>('default');
  const [provider, setProvider] = useState<'google' | 'line' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth') as AuthStatus | null;
    const authProvider = params.get('provider');

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

  return (
    <div className="min-h-screen bg-slate-50 font-['Kanit',sans-serif] text-slate-900">
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

      <main className="mx-auto grid min-h-[calc(100vh-77px)] max-w-7xl lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="hidden items-center justify-center bg-emerald-50 px-10 lg:flex">
          <div className="max-w-lg text-center">
            <span className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-700 text-4xl text-white shadow-xl shadow-emerald-900/15">
              <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-black leading-tight text-slate-950">
              ระบบติดตาม RDU Clinics จังหวัดสตูล
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              พื้นที่สำหรับเจ้าหน้าที่ในการบันทึก ตรวจสอบ และติดตามผลการประเมิน
              คลินิกเอกชนอย่างปลอดภัย
            </p>
            <ul className="mt-8 space-y-3 text-left">
              {[
                'ยืนยันตัวตนผ่าน Google หรือ LINE',
                'จำกัดสิทธิ์เฉพาะบัญชีที่ได้รับอนุมัติ',
                'ข้อมูลเซสชันถูกเก็บในคุกกี้ที่ปลอดภัย',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/85 px-4 py-3 text-base font-medium text-slate-700"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
                    <i className="fa-solid fa-check" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10">
            {effectiveStatus === 'success' && isActiveAdmin ? (
              <div role="status" aria-live="polite" className="text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
                  <i className="fa-solid fa-check" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-bold">เข้าสู่ระบบสำเร็จ</h2>
                <p className="mt-2 text-base text-slate-600">
                  ยินดีต้อนรับ {currentUser.name}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={onGoBackHome}
                    className="min-h-12 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  >
                    ไปยังหน้าหลัก
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
                <h2 className="text-2xl font-black sm:text-3xl">
                  เข้าสู่ระบบเจ้าหน้าที่
                </h2>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  เลือกบัญชี Google หรือ LINE ที่ได้รับอนุมัติจากผู้ดูแลระบบ
                </p>

                {effectiveStatus !== 'default' &&
                  effectiveStatus !== 'success' && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className={`mt-6 rounded-xl border p-4 ${
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
                        <div>
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
                      </div>
                    </div>
                  )}

                {effectiveStatus === 'pending' &&
                  currentUser?.provider === 'line' &&
                  currentUser.emailOrId && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">
                        LINE User ID สำหรับเพิ่มสิทธิ์
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

                <div className="mt-6">
                  <AuthProviderButtons
                    onStart={(selectedProvider) => setProvider(selectedProvider)}
                  />
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                  </span>
                  <p>
                    ระบบจะไม่เห็นรหัสผ่านของคุณ และอนุญาตเฉพาะบัญชีเจ้าหน้าที่
                    ที่ลงทะเบียนไว้
                  </p>
                </div>

                <p className="mt-5 text-center text-sm text-slate-600">
                  มีปัญหาในการเข้าสู่ระบบ?{' '}
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
