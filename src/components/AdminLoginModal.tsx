import { useEffect, useRef } from 'react';
import { AuthProviderButtons } from './AuthProviderButtons';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = dialog?.querySelectorAll<HTMLElement>(focusableSelector);
    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const elements = Array.from(
        dialog.querySelectorAll(focusableSelector)
      ) as HTMLElement[];
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-modal-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="admin-login-modal-title"
              className="text-2xl font-black text-slate-900"
            >
              เข้าสู่ระบบเจ้าหน้าที่
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              เลือกบัญชีที่ได้รับอนุมัติจากผู้ดูแลระบบ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
            aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6">
          <AuthProviderButtons />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">
          <i
            className="fa-solid fa-lock mt-1 text-emerald-700"
            aria-hidden="true"
          />
          ระบบไม่เห็นรหัสผ่านของคุณ และจะตรวจสิทธิ์จากเซิร์ฟเวอร์ทุกครั้ง
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 w-full rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
