import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { SettingsConfig } from '../types';
import { fetchFromGas } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsConfig;
  onSaveSettings: (newSettings: SettingsConfig) => void;
  onRefreshDataFromGas: () => Promise<void>;
  onResetLocalData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRefreshDataFromGas,
  onResetLocalData,
}) => {
  const [gasWebAppUrl, setGasWebAppUrl] = useState(settings.gasWebAppUrl || '');
  const [spreadsheetId, setSpreadsheetId] = useState(settings.spreadsheetId || '');
  const [isLiveApiActive, setIsLiveApiActive] = useState(settings.isLiveApiActive || false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedSettings: SettingsConfig = {
      ...settings,
      gasWebAppUrl: gasWebAppUrl.trim(),
      spreadsheetId: spreadsheetId.trim(),
      telegramBotToken: '',
      telegramChatId: '',
      isLiveApiActive,
    };

    onSaveSettings(updatedSettings);

    if (isLiveApiActive && gasWebAppUrl.trim()) {
      try {
        await onRefreshDataFromGas();
        Swal.fire({
          icon: 'success',
          title: 'บันทึกการตั้งค่า และซิงค์ข้อมูล Google Sheets เรียบร้อย! 🚀',
          text: 'ระบบเริ่มดึงข้อมูลจาก Google Apps Script Web App แบบเรียลไทม์แล้ว',
          confirmButtonColor: '#059669',
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        Swal.fire({
          icon: 'warning',
          title: 'บันทึกการตั้งค่าแล้ว แต่ซิงค์ Google Sheets ล้มเหลว',
          text: errorMsg || 'กรุณาตรวจสอบ Web App URL และการตั้งค่าสิทธิ์ Deploy (Anyone)',
          confirmButtonColor: '#059669',
        });
      }
    } else {
      Swal.fire({
        icon: 'success',
        title: 'บันทึกการตั้งค่าเรียบร้อยแล้ว!',
        text: 'ระบบใช้งานในโหมด Local Storage (พร้อมใช้งานเต็มรูปแบบ)',
        confirmButtonColor: '#059669',
      });
    }

    onClose();
  };

  const handleTestGasConnection = async () => {
    if (!gasWebAppUrl.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุ Web App URL ก่อนทดสอบ',
        confirmButtonColor: '#059669',
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      await fetchFromGas(gasWebAppUrl.trim());
      setIsTestingConnection(false);

      Swal.fire({
        icon: 'success',
        title: 'เชื่อมต่อ Google Apps Script สำเร็จ! ✅',
        text: 'ได้รับตอบกลับ JSON จาก Google Sheets เรียบร้อยแล้ว',
        confirmButtonColor: '#059669',
      });
    } catch (err: unknown) {
      setIsTestingConnection(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      Swal.fire({
        icon: 'error',
        title: 'การเชื่อมต่อล้มเหลว',
        text: errorMsg || 'กรุณาตรวจสอบว่าได้ตั้งค่า Web App Deploy ให้ "Anyone" สามารถเข้าถึงได้',
        confirmButtonColor: '#059669',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 overflow-y-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-sliders text-emerald-400"></i>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                ตั้งค่าการเชื่อมต่อ (Google Sheets & Telegram)
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดการเชื่อมต่อ Google Apps Script Web API และการส่งการแจ้งเตือน
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

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Live API Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-slate-800">
                เปิดใช้งาน Google Sheets Live API
              </span>
              <span className="block text-[11px] text-slate-500">
                ดึงและบันทึกข้อมูลไปยัง Google Sheets โดยตรงผ่าน Web App URL
              </span>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isLiveApiActive}
                onChange={(e) => setIsLiveApiActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Google Apps Script Web App URL:</span>
              <button
                type="button"
                onClick={handleTestGasConnection}
                disabled={isTestingConnection}
                className="text-[10px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-plug text-emerald-600"></i>
                <span>{isTestingConnection ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
              </button>
            </label>
            <input
              type="url"
              value={gasWebAppUrl}
              onChange={(e) => setGasWebAppUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full p-2.5 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Spreadsheet ID Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Google Spreadsheet ID (ตัวอย่าง):
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="1AbC_Satun_RDU_Private_Clinics_Sheet_2569"
              className="w-full p-2.5 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Telegram Bot Token & Chat ID */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <i className="fa-brands fa-telegram text-sky-500 text-base"></i>
              <h4 className="text-xs font-bold text-slate-800">
                ตั้งค่า Telegram Admin Notification (แจ้งเตือนกลุ่ม)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Telegram Bot Token (Server):
                </label>
                <input
                  type="password"
                  value="••••••••••••••••"
                  disabled
                  className="w-full p-2 text-xs font-mono rounded-xl bg-slate-100 border border-slate-200 text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Telegram Chat ID:
                </label>
                <input
                  type="text"
                  value="ตั้งค่าฝั่งเซิร์ฟเวอร์แล้ว"
                  disabled
                  className="w-full p-2 text-xs font-mono rounded-xl bg-slate-100 border border-slate-200 text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Reset Data Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                Swal.fire({
                  title: 'ยืนยันการล้างข้อมูล Local Storage?',
                  text: 'ระบบจะรีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นเริ่มต้นของจังหวัดสตูล',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#e11d48',
                  cancelButtonColor: '#64748b',
                  confirmButtonText: 'ใช่, รีเซ็ตข้อมูล',
                  cancelButtonText: 'ยกเลิก',
                }).then((result) => {
                  if (result.isConfirmed) {
                    onResetLocalData();
                    Swal.fire('รีเซ็ตสำเร็จ!', 'ข้อมูลถูกคืนค่าเริ่มต้นแล้ว', 'success');
                    onClose();
                  }
                });
              }}
              className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-rotate-left"></i>
              <span>คืนค่าข้อมูลเริ่มต้น (Reset Demo Data)</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              <i className="fa-solid fa-check"></i>
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
