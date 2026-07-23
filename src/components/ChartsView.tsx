import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ProvincialSummary } from '../types';
import { Clinic } from '../types';

interface ChartsViewProps {
  summary: ProvincialSummary;
  clinics: Clinic[];
}

export const ChartsView: React.FC<ChartsViewProps> = ({ summary, clinics }) => {
  // District comparison data for BarChart
  const districtData = summary.districtSummaries.map((d) => ({
    name: `อ.${d.district}`,
     passed: d.passedCount,
    pending: d.pendingCount,
    total: d.totalClinics,
    passPct: d.passPercentage,
  }));

  // Level Distribution Data for PieChart
  const level3Count = clinics.filter((c) => c.assessmentLevel === 3).length;
  const level2Count = clinics.filter((c) => c.assessmentLevel === 2).length;
  const level1Count = clinics.filter((c) => c.assessmentLevel === 1).length;
  const unassessedCount = clinics.filter((c) => c.assessmentLevel === null).length;

  const levelPieData = [
    { name: 'ระดับ 3 (ผ่านดีเยี่ยม)', value: level3Count, color: '#059669' },
    { name: 'ระดับ 2 (ผ่านเกณฑ์)', value: level2Count, color: '#10b981' },
    { name: 'ระดับ 1 (ต้องปรับปรุง)', value: level1Count, color: '#f43f5e' },
    { name: 'ยังไม่ได้ประเมิน', value: unassessedCount, color: '#cbd5e1' },
  ];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
          <i className="fa-solid fa-chart-pie"></i>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            กราฟสรุปสถิติผลการประเมิน RDU คลินิกเอกชน จังหวัดสตูล
          </h3>
          <p className="text-xs text-slate-500">
            วิเคราะห์เปรียบเทียบสัดส่วนผ่านเกณฑ์รายอำเภอ และระดับผลการประเมินเพื่อวางแผนเชิงยุทธศาสตร์
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Chart 1: District Bar Chart Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-chart-column text-emerald-600"></i>
                <span>เปรียบเทียบจำนวนคลินิกผ่านเกณฑ์ (Level 2+) รายอำเภอ</span>
              </h4>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="passed" name="ผ่านเกณฑ์ (L2+)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pending" name="รอประเมิน / ไม่ผ่าน" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            *เป้าหมายยุทธศาสตร์: คลินิกผ่านเกณฑ์ RDU ไม่น้อยกว่า 25% ในแต่ละอำเภอ
          </p>
        </div>

        {/* Chart 2: Donut Chart Level Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-emerald-600"></i>
                <span>สัดส่วนระดับผลการประเมิน RDU ทั้งจังหวัด</span>
              </h4>
            </div>
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levelPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {levelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs mt-2 pt-2 border-t border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <span className="block text-[10px]">ผ่านเกณฑ์รวม</span>
              <span className="font-extrabold text-sm">{level3Count + level2Count} แห่ง ({summary.overallPassPercentage}%)</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
              <span className="block text-[10px]">รอการประเมิน</span>
              <span className="font-extrabold text-sm">{unassessedCount} แห่ง</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
