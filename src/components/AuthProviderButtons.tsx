import { useState } from 'react';

type AuthProvider = 'google' | 'line';

interface AuthProviderButtonsProps {
  onStart?: (provider: AuthProvider) => void;
}

export function AuthProviderButtons({ onStart }: AuthProviderButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);

  const startLogin = (provider: AuthProvider) => {
    setLoadingProvider(provider);
    onStart?.(provider);
    window.location.assign(`/api/auth/${provider}`);
  };

  const disabled = loadingProvider !== null;

  return (
    <div className="space-y-3" aria-label="เลือกช่องทางเข้าสู่ระบบ">
      <button
        type="button"
        onClick={() => startLogin('google')}
        disabled={disabled}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 shrink-0"
        >
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.22-.2-1.75H12v3.41h5.52a4.8 4.8 0 0 1-2.05 3.06l-.02.11 2.98 2.31.21.02c1.91-1.76 3-4.36 3-7.16"
          />
          <path
            fill="#34A853"
            d="M12 22c2.74 0 5.04-.9 6.72-2.45l-3.2-2.48c-.86.58-2.02.99-3.52.99a6.1 6.1 0 0 1-5.76-4.22l-.11.01-3.1 2.4-.04.1A10.14 10.14 0 0 0 12 22"
          />
          <path
            fill="#FBBC05"
            d="M6.24 13.84A6.3 6.3 0 0 1 5.9 11.8c0-.72.13-1.4.33-2.04l-.01-.13-3.14-2.44-.1.05A10.2 10.2 0 0 0 1.9 11.8c0 1.64.39 3.18 1.08 4.56z"
          />
          <path
            fill="#EA4335"
            d="M12 5.55c1.9 0 3.18.82 3.91 1.5l2.88-2.82C17.02 2.59 14.74 1.6 12 1.6a10.14 10.14 0 0 0-9.01 5.64l3.24 2.52A6.12 6.12 0 0 1 12 5.55"
          />
        </svg>
        <span>
          {loadingProvider === 'google'
            ? 'กำลังเชื่อมต่อ Google…'
            : 'ดำเนินการต่อด้วย Google'}
        </span>
      </button>

      <button
        type="button"
        onClick={() => startLogin('line')}
        disabled={disabled}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#05B84D] focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-wait disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="flex h-7 min-w-10 items-center justify-center rounded-lg bg-white px-1 text-[9px] font-black tracking-tight text-[#06C755]"
        >
          LINE
        </span>
        <span>
          {loadingProvider === 'line'
            ? 'กำลังเชื่อมต่อ LINE…'
            : 'ดำเนินการต่อด้วย LINE'}
        </span>
      </button>
    </div>
  );
}
