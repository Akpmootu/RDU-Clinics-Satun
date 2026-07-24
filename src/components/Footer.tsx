import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 bg-white border-t border-slate-200 py-6 px-4 text-xs text-slate-500 no-print">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Credit & Icon */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <i className="fa-solid fa-hospital-user"></i>
          </div>
          <div>
            <p className="font-bold text-slate-800">
              ระบบติดตามการประเมินการใช้ยาอย่างสมเหตุผล (RDU) ในคลินิกเอกชน จังหวัดสตูล
            </p>
            <p className="text-[11px] text-slate-500">
              กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค สำนักงานสาธารณสุขจังหวัดสตูล
            </p>
          </div>
        </div>

        {/* Center Official Developer Credit */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
          <i className="fa-solid fa-code text-emerald-600"></i>
          <span>พัฒนาโดย IT SSJ Satun 2569</span>
        </div>

        {/* Right Info */}
        <div className="text-center md:text-right text-[11px] text-slate-400 space-y-0.5">
          <p>© 2569 สำนักงานสาธารณสุขจังหวัดสตูล (Satun Provincial Health Office)</p>
          <p>ระบบประมวลผลข้อมูล RDU เรียลไทม์ • รองรับการใช้งานผ่านมือถือและแท็บเล็ต 📱</p>
        </div>

      </div>
    </footer>
  );
};
