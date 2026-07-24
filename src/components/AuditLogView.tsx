import React, { useState } from 'react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.clinicName.toLowerCase().includes(term) ||
      log.district.toLowerCase().includes(term) ||
      log.editedBy.toLowerCase().includes(term) ||
      log.remarks.toLowerCase().includes(term) ||
      log.id.toLowerCase().includes(term)
    );
  });

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ประวัติการบันทึกแก้ไขข้อมูล (Audit Trail Logs)
            </h3>
            <p className="text-xs text-slate-500">
              บันทึกร่องรอยการปรับปรุงสถานะการประเมิน RDU เพื่อความโปร่งใสและตรวจสอบย้อนหลังทุกขั้นตอน
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อคลินิก, ผู้บันทึก..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
          />
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5">วันเวลา</th>
                <th className="py-3 px-3.5">อำเภอ</th>
                <th className="py-3 px-3.5">ชื่อคลินิก</th>
                <th className="py-3 px-3.5">สถานะเดิม ➔ สถานะใหม่</th>
                <th className="py-3 px-3.5">ระดับเดิม ➔ ระดับใหม่</th>
                <th className="py-3 px-3.5">ผู้บันทึก</th>
                <th className="py-3 px-3.5">หมายเหตุ</th>
                <th className="py-3 px-3.5 text-center">Telegram</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ไม่พบประวัติการแก้ไขข้อมูล
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-800 whitespace-nowrap">
                      {log.district}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      {log.clinicName}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-slate-400">{log.previousStatus}</span>
                      <span className="mx-1 text-slate-400">➔</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {log.newStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-slate-400">{log.previousLevel}</span>
                      <span className="mx-1 text-slate-400">➔</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {log.newLevel}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                      <i className="fa-solid fa-user-pen text-slate-400 mr-1"></i>
                      {log.editedBy}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate">
                      {log.remarks}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {log.telegramSent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                          <i className="fa-brands fa-telegram text-sky-600"></i>
                          <span>ส่งแล้ว</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-slate-100 text-slate-500">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
