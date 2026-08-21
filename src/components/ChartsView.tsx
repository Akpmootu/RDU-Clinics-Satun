import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clinic, ProvincialSummary } from '../types';

interface ChartsViewProps {
  summary: ProvincialSummary;
  clinics: Clinic[];
}

const tooltipStyle = {
  backgroundColor: '#0f172a',
  color: '#fff',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: '14px',
  fontSize: '12px',
  boxShadow: '0 18px 40px rgba(15,23,42,.2)',
};

const ChartCard = ({ title, subtitle, icon, children, className = '' }: { title: string; subtitle: string; icon: string; children: React.ReactNode; className?: string }) => (
  <article className={`overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.05)] ${className}`}>
    <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300"><i className={`fa-solid ${icon}`}></i></span>
      <div>
        <h4 className="font-display text-sm font-bold text-slate-950 sm:text-base">{title}</h4>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{subtitle}</p>
      </div>
    </header>
    <div className="p-4 sm:p-5">{children}</div>
  </article>
);

export const ChartsView: React.FC<ChartsViewProps> = ({ summary, clinics }) => {
  const [districtFocus, setDistrictFocus] = useState<string>('ทั้งหมด');
  const filteredClinics = districtFocus === 'ทั้งหมด' ? clinics : clinics.filter((clinic) => clinic.district === districtFocus);

  const districtData = summary.districtSummaries.map((district) => ({
    name: `อ.${district.district}`,
    district: district.district,
    total: district.totalClinics,
    assessed: district.assessedCount,
    passed: district.passedCount,
    pending: district.pendingCount,
    passPct: district.passPercentage,
    coveragePct: district.totalClinics > 0 ? Number(((district.assessedCount / district.totalClinics) * 100).toFixed(1)) : 0,
  }));

  const levelData = [
    { name: 'ระดับ 3', value: filteredClinics.filter((clinic) => clinic.assessmentLevel === 3).length, color: '#047857' },
    { name: 'ระดับ 2', value: filteredClinics.filter((clinic) => clinic.assessmentLevel === 2).length, color: '#10b981' },
    { name: 'ระดับ 1', value: filteredClinics.filter((clinic) => clinic.assessmentLevel === 1).length, color: '#fb7185' },
    { name: 'ยังไม่ประเมิน', value: filteredClinics.filter((clinic) => clinic.assessmentLevel === null).length, color: '#cbd5e1' },
  ];

  const typeData = useMemo(() => {
    const map = new Map<string, { type: string; total: number; assessed: number; passed: number }>();
    for (const clinic of filteredClinics) {
      const current = map.get(clinic.type) || { type: clinic.type, total: 0, assessed: 0, passed: 0 };
      current.total += 1;
      if (clinic.assessmentStatus === 'ประเมินแล้ว') current.assessed += 1;
      if ((clinic.assessmentLevel || 0) >= 2) current.passed += 1;
      map.set(clinic.type, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 6).map((item) => ({ ...item, shortName: item.type.replace('คลินิก', '').slice(0, 18) || item.type }));
  }, [filteredClinics]);

  const timelineData = useMemo(() => {
    const monthly = new Map<string, number>();
    for (const clinic of filteredClinics) {
      const rawDate = clinic.assessmentDate || clinic.updatedAt;
      if (!rawDate || clinic.assessmentStatus !== 'ประเมินแล้ว') continue;
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly.set(key, (monthly.get(key) || 0) + 1);
    }
    let cumulative = 0;
    return [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => {
      cumulative += count;
      return { month, monthly: count, cumulative };
    });
  }, [filteredClinics]);

  const provinceAssessedPct = summary.totalTargetClinics > 0 ? Number(((summary.assessedClinics / summary.totalTargetClinics) * 100).toFixed(1)) : 0;
  const riskDistricts = districtData.filter((district) => district.passPct < summary.overallTargetPercentage).sort((a, b) => a.passPct - b.passPct);
  const topDistrict = [...districtData].sort((a, b) => b.passPct - a.passPct)[0];

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-800 bg-slate-950 px-5 py-6 text-white shadow-[0_26px_70px_rgba(15,23,42,.18)] sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"></div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Executive Analytics</p>
            <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">ภาพรวมผลประเมิน RDU สำหรับผู้บริหาร</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">วิเคราะห์ความครอบคลุม ผลสัมฤทธิ์ ความเสี่ยงรายพื้นที่ ประเภทคลินิก และแนวโน้มตามเวลาในหน้าเดียว</p>
          </div>
          <label className="text-xs font-bold text-slate-300">
            พื้นที่วิเคราะห์
            <select value={districtFocus} onChange={(event) => setDistrictFocus(event.target.value)} className="mt-1 block h-11 min-w-52 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none backdrop-blur focus:border-emerald-400">
              <option className="text-slate-900" value="ทั้งหมด">ทั้งจังหวัด</option>
              {summary.districtSummaries.map((district) => <option className="text-slate-900" key={district.district} value={district.district}>อำเภอ{district.district}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'ความครอบคลุมการประเมิน', value: `${provinceAssessedPct}%`, detail: `${summary.assessedClinics} จาก ${summary.totalTargetClinics} แห่ง`, tone: 'text-blue-700 bg-blue-50' },
          { label: 'ผ่านเกณฑ์ระดับ 2+', value: `${summary.overallPassPercentage}%`, detail: `เป้าหมาย ${summary.overallTargetPercentage}%`, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'พื้นที่ต่ำกว่าเป้าหมาย', value: `${riskDistricts.length} อำเภอ`, detail: riskDistricts.length ? `เร่งรัด ${riskDistricts[0].name}` : 'ทุกพื้นที่ผ่านเป้าหมาย', tone: 'text-amber-700 bg-amber-50' },
          { label: 'พื้นที่ผลงานสูงสุด', value: topDistrict?.name || '-', detail: topDistrict ? `${topDistrict.passPct}% ผ่านเกณฑ์` : 'ไม่มีข้อมูล', tone: 'text-violet-700 bg-violet-50' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
            <strong className="font-display mt-2 block text-2xl font-bold text-slate-950">{item.value}</strong>
            <span className={`mt-3 inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${item.tone}`}>{item.detail}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard className="lg:col-span-7" title="ผลประเมินรายอำเภอ" subtitle="เทียบจำนวนประเมินแล้ว ผ่านเกณฑ์ และรายการที่ต้องติดตาม" icon="fa-chart-column">
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={districtData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis tick={{ fontSize: 11, fill: '#64748b' }} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="assessed" name="ประเมินแล้ว" fill="#0ea5e9" radius={[6, 6, 0, 0]} /><Bar dataKey="passed" name="ผ่านระดับ 2+" fill="#10b981" radius={[6, 6, 0, 0]} /><Bar dataKey="pending" name="ต้องติดตาม" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </ChartCard>

        <ChartCard className="lg:col-span-5" title="โครงสร้างระดับผลประเมิน" subtitle={districtFocus === 'ทั้งหมด' ? 'สัดส่วนทั้งจังหวัด' : `เฉพาะอำเภอ${districtFocus}`} icon="fa-chart-pie">
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={levelData} cx="50%" cy="45%" innerRadius={62} outerRadius={98} paddingAngle={4} dataKey="value">{levelData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div>
        </ChartCard>

        <ChartCard className="lg:col-span-5" title="ดัชนีความพร้อมรายอำเภอ" subtitle="เปรียบเทียบความครอบคลุมการประเมินกับอัตราผ่านเกณฑ์" icon="fa-bullseye">
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><RadarChart data={districtData}><PolarGrid stroke="#cbd5e1" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} /><Radar name="ความครอบคลุม" dataKey="coveragePct" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} /><Radar name="ผ่านเกณฑ์" dataKey="passPct" stroke="#10b981" fill="#10b981" fillOpacity={0.28} /><Legend wrapperStyle={{ fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /></RadarChart></ResponsiveContainer></div>
        </ChartCard>

        <ChartCard className="lg:col-span-7" title="ผลลัพธ์แยกตามประเภทคลินิก" subtitle="ช่วยจัดลำดับกลุ่มวิชาชีพที่ควรเร่งประเมินหรือสนับสนุน" icon="fa-layer-group">
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 10, left: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="shortName" width={110} tick={{ fontSize: 10, fill: '#475569' }} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="total" name="ทั้งหมด" fill="#cbd5e1" radius={[0, 6, 6, 0]} /><Bar dataKey="assessed" name="ประเมินแล้ว" fill="#38bdf8" radius={[0, 6, 6, 0]} /><Bar dataKey="passed" name="ผ่านระดับ 2+" fill="#10b981" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
        </ChartCard>

        <ChartCard className="lg:col-span-8" title="แนวโน้มการประเมินสะสม" subtitle="จำนวนการประเมินรายเดือนและยอดสะสมจาก assessmentDate/updatedAt" icon="fa-arrow-trend-up">
          {timelineData.length > 0 ? (
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={timelineData} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}><defs><linearGradient id="assessmentGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="cumulative" name="ยอดสะสม" stroke="#059669" strokeWidth={3} fill="url(#assessmentGradient)" /><Line type="monotone" dataKey="monthly" name="รายเดือน" stroke="#0ea5e9" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"><i className="fa-regular fa-calendar-xmark text-3xl text-slate-300"></i><p className="mt-3 text-sm font-bold text-slate-600">ยังไม่มีวันที่ประเมินเพียงพอสำหรับกราฟแนวโน้ม</p><p className="mt-1 text-xs text-slate-400">บันทึก assessmentDate แล้วกราฟจะปรากฏอัตโนมัติ</p></div>
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-4" title="อันดับพื้นที่ตามอัตราผ่าน" subtitle="เส้นเป้าหมายขั้นต่ำของจังหวัดอยู่ที่ 25%" icon="fa-ranking-star">
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...districtData].sort((a, b) => b.passPct - a.passPct)} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 10 }} /><Tooltip contentStyle={tooltipStyle} /><Line dataKey="passPct" name="อัตราผ่าน" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5, fill: '#8b5cf6' }} /></LineChart></ResponsiveContainer></div>
        </ChartCard>
      </div>
    </section>
  );
};
