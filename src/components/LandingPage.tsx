import React from 'react';
import { ProvincialSummary } from '../types';

interface LandingPageProps {
  summary: ProvincialSummary;
  userRole: 'admin' | 'user';
  onNavigateToDashboard: () => void;
  onOpenAdminLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  summary,
  userRole,
  onNavigateToDashboard,
  onOpenAdminLogin,
}) => {
  return (
    <div className="space-y-10 animate-fadeIn max-w-6xl mx-auto py-2">
      
      {/* 1. Official Hero Section */}
      <section className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 text-slate-800">
        
        {/* Decorative Background Accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6 text-center max-w-3xl mx-auto">
          
          {/* Official Agency Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-bold shadow-xs">
            <i className="fa-solid fa-hospital-user text-emerald-600"></i>
            <span>กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค สำนักงานสาธารณสุขจังหวัดสตูล</span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            ระบบติดตามการประเมินการใช้ยาอย่างสมเหตุผล
            <span className="block text-emerald-600 mt-1">
              (RDU Clinics) ในคลินิกเอกชน จังหวัดสตูล 2569
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
            แพลตฟอร์มสารสนเทศเพื่อยกระดับมาตรฐานความปลอดภัยด้านยาในคลินิกเวชกรรม ทันตกรรม การพยาบาล และแพทย์แผนไทย ครอบคลุมทั้ง 7 อำเภอของจังหวัดสตูล ด้วยระบบประมวลผลเรียลไทม์
          </p>

          {/* Call to Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onNavigateToDashboard}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 group"
            >
              <i className="fa-solid fa-chart-line text-lg group-hover:scale-110 transition-transform"></i>
              <span>เข้าสู่ระบบติดตาม / แดชบอร์ดข้อมูล</span>
            </button>

            {userRole === 'user' ? (
              <button
                onClick={onOpenAdminLogin}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-user-shield text-emerald-400"></i>
                <span>เข้าสู่ระบบสำหรับแอดมิน (Admin Login)</span>
              </button>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <i className="fa-solid fa-check-circle text-emerald-600 text-sm"></i>
                <span>ท่านอยู่ในโหมดผู้ดูแลระบบ (Admin Mode Active)</span>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 2. Provincial Key Performance Indicators (KPI Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-award text-emerald-600 text-lg"></i>
            <h2 className="text-lg font-bold text-slate-900">
              ตัวชี้วัดความสำเร็จการประเมิน RDU ภาพรวมจังหวัดสตูล
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            เป้าหมายจังหวัด ≥ 25.0%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Targeted Clinics */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">เป้าหมายคลินิกเอกชนทั้งหมด</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold">
                <i className="fa-solid fa-clinic-medical"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {summary.totalTargetClinics} <span className="text-xs font-medium text-slate-500">แห่ง</span>
            </div>
            <p className="text-[11px] text-slate-500">
              คลินิกเป้าหมายที่ต้องได้รับการประเมินทั้ง 7 อำเภอ
            </p>
          </div>

          {/* Card 2: Assessed Count */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">ได้รับการประเมินตนเองแล้ว</span>
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-bold">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-900">
              {summary.assessedClinics} <span className="text-xs font-medium text-slate-500">แห่ง</span>
            </div>
            <p className="text-[11px] text-slate-500">
              ประเมินแล้ว คิดเป็น {summary.totalTargetClinics > 0 ? ((summary.assessedClinics / summary.totalTargetClinics) * 100).toFixed(1) : 0}% ของทั้งหมด
            </p>
          </div>

          {/* Card 3: Passed Count (>= Level 2) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">ผ่านเกณฑ์ RDU (≥ ระดับ 2)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                <i className="fa-solid fa-circle-check"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {summary.passedClinics} <span className="text-xs font-medium text-slate-500">แห่ง</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold">
              ระดับผลการประเมินอยู่ในระดับ 2 หรือ 3
            </p>
          </div>

          {/* Card 4: Overall Pass Percentage vs Target */}
          <div className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition space-y-2 ${
            summary.isProvinceTargetAchieved
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-amber-500 text-white border-amber-600'
          }`}>
            <div className="flex items-center justify-between opacity-90">
              <span className="text-xs font-bold">สัดส่วนที่ผ่านเกณฑ์ภาพรวม</span>
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center text-sm font-bold">
                <i className="fa-solid fa-bullseye"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold">
              {summary.overallPassPercentage}%
            </div>
            <p className="text-[11px] opacity-90 font-medium">
              {summary.isProvinceTargetAchieved
                ? '✅ บรรลุเป้าหมายจังหวัด (≥ 25.0%)'
                : '⏳ กำลังดำเนินการขับเคลื่อนให้ถึง 25.0%'}
            </p>
          </div>

        </div>
      </section>

      {/* 3. Feature Capabilities Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-cubes text-emerald-600 text-lg"></i>
          <h2 className="text-lg font-bold text-slate-900">
            คุณสมบัติและฟังก์ชันหลักของระบบ (System Features)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              แดชบอร์ดสรุปผลรายอำเภอ
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              แสดงสถิติและเป้าหมายการประเมิน RDU แยกตาม 7 อำเภอ ได้แก่ เมือง, ท่าแพ, ละงู, ควนกาหลง, ควนโดน, ทุ่งหว้า และมะนัง พร้อมกราฟเปรียบเทียบ
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-file-excel"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ซิงค์ Google Sheets Live API
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              อ่านและบันทึกข้อมูลย้อนกลับไปยัง Google Sheets โดยอัตโนมัติ รองรับการเพิ่ม ลบ หรือแทรกสถานพยาบาลในอนาคตโดยไม่กระทบผลรวม
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl font-bold">
              <i className="fa-brands fa-telegram"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Telegram Group Notification
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ส่งการแจ้งเตือนผลการประเมินแบบเรียลไทม์เข้ากลุ่ม Telegram ของเจ้าหน้าที่ พร้อม Inline Keyboard Link สำหรับเปิดดูข้อมูล
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-user-gear"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              แบ่งสิทธิ์การใช้งาน (Admin / User)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              แบ่งสิทธิ์ชัดเจนระหว่างผู้ใช้งานทั่วไป (ดูคะแนนสถิติ) และเจ้าหน้าที่แอดมิน (สามารถบันทึก Key in และแก้ไขข้อมูลได้)
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Audit Trail & History Logs
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              บันทึกประวัติการปรับปรุงสถานะ RDU ย้อนหลังอย่างละเอียดยิบ พร้อมระบุชื่อผู้แก้ไข วันเวลา และหมายเหตุ เพื่อความโปร่งใส
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-mobile-screen"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Responsive & TV Display Mode
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ดีไซน์รองรับการใช้งานบนมือถือ แท็บเล็ต คอมพิวเตอร์ และมีโหมด TV Display สำหรับจัดแสดงบนหน้าจอห้องประชุม
            </p>
          </div>

        </div>
      </section>

      {/* 4. RDU Criteria Guide */}
      <section className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold">
            <i className="fa-solid fa-list-check"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              เกณฑ์ระดับผลการประเมิน RDU Clinics
            </h3>
            <p className="text-xs text-slate-400">
              การประเมินตนเองตามเกณฑ์มาตรฐานความปลอดภัยและการใช้ยาอย่างสมเหตุผล
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">ระดับ 1</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                ไม่ผ่านเกณฑ์
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              มีการประเมินตนเอง แต่ยังต้องปรับปรุงระบบสั่งจ่ายยาปฏิชีวนะและการให้ข้อมูลผู้ป่วย
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">ระดับ 2 ⭐⭐</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                ผ่านเกณฑ์
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ผ่านเกณฑ์มาตรฐาน RDU มีระบบควบคุมการจ่ายยาปฏิชีวนะและป้ายสัญลักษณ์ RDU Clinic
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">ระดับ 3 ⭐⭐⭐</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                ผ่านเกณฑ์ระดับสูงสุด
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ระดับดีเยี่ยม มีคู่มือ RDU, ระบบบันทึกอิเล็กทรอนิกส์ และเป็นแบบอย่างคลินิก RDU ต้นแบบ
            </p>
          </div>

        </div>
      </section>

    </div>
  );
};
