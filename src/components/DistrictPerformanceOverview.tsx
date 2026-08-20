import React from 'react';
import { DistrictSummary } from '../types';
import { ProgressScale } from './ProgressScale';

interface DistrictPerformanceOverviewProps {
  summary: DistrictSummary;
}

interface OverviewMetricProps {
  label: string;
  value: string | number;
  helper: string;
  icon: string;
  tone: 'slate' | 'blue' | 'emerald' | 'amber';
}

const toneStyles = {
  slate: {
    surface: 'border-slate-200 bg-white',
    icon: 'bg-slate-100 text-slate-700',
    value: 'text-slate-950',
  },
  blue: {
    surface: 'border-blue-100 bg-blue-50/60',
    icon: 'bg-blue-100 text-blue-700',
    value: 'text-blue-900',
  },
  emerald: {
    surface: 'border-emerald-100 bg-emerald-50/60',
    icon: 'bg-emerald-100 text-emerald-700',
    value: 'text-emerald-900',
  },
  amber: {
    surface: 'border-amber-100 bg-amber-50/60',
    icon: 'bg-amber-100 text-amber-700',
    value: 'text-amber-900',
  },
};

const OverviewMetric: React.FC<OverviewMetricProps> = ({
  label,
  value,
  helper,
  icon,
  tone,
}) => {
  const styles = toneStyles[tone];

  return (
    <div className={`rounded-2xl border p-3.5 ${styles.surface}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold leading-4 text-slate-500 sm:text-[11px]">{label}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] ${styles.icon}`} aria-hidden="true">
          <i className={`fa-solid ${icon}`}></i>
        </span>
      </div>
      <strong className={`font-display mt-2 block text-2xl font-bold leading-none ${styles.value}`}>{value}</strong>
      <span className="mt-2 block text-[9px] font-medium leading-4 text-slate-400">{helper}</span>
    </div>
  );
};

export const DistrictPerformanceOverview: React.FC<DistrictPerformanceOverviewProps> = ({ summary }) => {
  const assessedPercentage = summary.totalClinics > 0
    ? Math.round((summary.assessedCount / summary.totalClinics) * 100)
    : 0;
  const targetClinicCount = Math.ceil(summary.totalClinics * (summary.targetPercentage / 100));
  const remainingToTarget = Math.max(targetClinicCount - summary.passedCount, 0);
  const aboveTargetCount = Math.max(summary.passedCount - targetClinicCount, 0);
  const assessmentBacklog = Math.max(summary.totalClinics - summary.assessedCount, 0);
  const safePassPercentage = Math.min(Math.max(summary.passPercentage, 0), 100);

  const insight = summary.isTargetAchieved
    ? {
        eyebrow: 'เป้าหมายสำเร็จ',
        title: aboveTargetCount > 0 ? `นำหน้าเป้าหมาย ${aboveTargetCount} แห่ง` : 'แตะเป้าหมายขั้นต่ำแล้ว',
        description: assessmentBacklog > 0
          ? `รักษาระดับผลลัพธ์และติดตามการประเมินที่เหลืออีก ${assessmentBacklog} แห่ง`
          : 'ประเมินครบทุกแห่งแล้ว ควรรักษามาตรฐานและติดตามคุณภาพอย่างต่อเนื่อง',
        icon: 'fa-arrow-trend-up',
        surface: 'border-emerald-200 bg-emerald-50',
        iconSurface: 'bg-emerald-600 text-white',
        eyebrowTone: 'text-emerald-700',
        titleTone: 'text-emerald-950',
      }
    : {
        eyebrow: 'สิ่งที่ต้องเร่งดำเนินการ',
        title: `ต้องผ่านเพิ่ม ${remainingToTarget} แห่ง`,
        description: assessmentBacklog > 0
          ? `จัดลำดับติดตามคลินิกที่ยังไม่ประเมิน ${assessmentBacklog} แห่ง เพื่อให้ถึงเป้าหมายเร็วขึ้น`
          : 'ทบทวนผลประเมินที่ยังไม่ผ่านและกำหนดการปรับปรุงรายคลินิก',
        icon: 'fa-bullseye',
        surface: 'border-amber-200 bg-amber-50',
        iconSurface: 'bg-amber-500 text-white',
        eyebrowTone: 'text-amber-700',
        titleTone: 'text-amber-950',
      };

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]" aria-labelledby="district-performance-title">
      <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6">
          <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-emerald-100/60 blur-3xl" aria-hidden="true"></div>
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="mx-auto shrink-0 sm:mx-0">
              <div
                className="relative flex h-32 w-32 items-center justify-center rounded-full p-2 shadow-[0_12px_30px_rgba(15,118,110,0.15)] sm:h-36 sm:w-36"
                style={{
                  background: `conic-gradient(${summary.isTargetAchieved ? '#10b981' : '#f59e0b'} ${safePassPercentage * 3.6}deg, #e2e8f0 0deg)`,
                }}
                role="img"
                aria-label={`อัตราผ่านเกณฑ์ ${summary.passPercentage} เปอร์เซ็นต์`}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white shadow-inner">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Pass rate</span>
                  <strong className={`font-display mt-1 text-3xl font-bold tracking-tight ${summary.isTargetAchieved ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {summary.passPercentage}%
                  </strong>
                  <span className="mt-1 text-[9px] font-semibold text-slate-400">เป้าหมาย {summary.targetPercentage}%</span>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  summary.isTargetAchieved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  <i className={`fa-solid ${summary.isTargetAchieved ? 'fa-circle-check' : 'fa-clock'}`}></i>
                  {summary.isTargetAchieved ? 'ผ่านเป้าหมายอำเภอ' : 'อยู่ระหว่างดำเนินการ'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">ประเมินแล้ว {assessedPercentage}%</span>
              </div>
              <h3 id="district-performance-title" className="font-display mt-3 text-lg font-bold leading-snug text-slate-950 sm:text-xl">
                ภาพรวมผลการประเมินอำเภอ{summary.district}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                เปรียบเทียบผลผ่านระดับ 2 ขึ้นไปกับเกณฑ์ขั้นต่ำ พร้อมสรุปประเด็นที่ควรติดตามต่อ
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <OverviewMetric
                  label="คลินิกเป้าหมาย"
                  value={summary.totalClinics}
                  helper="แห่งทั้งหมด"
                  icon="fa-hospital"
                  tone="slate"
                />
                <OverviewMetric
                  label="ประเมินแล้ว"
                  value={summary.assessedCount}
                  helper={`${assessedPercentage}% ของทั้งหมด`}
                  icon="fa-clipboard-check"
                  tone="blue"
                />
                <OverviewMetric
                  label="ผ่านระดับ 2+"
                  value={summary.passedCount}
                  helper={`ขั้นต่ำ ${targetClinicCount} แห่ง`}
                  icon="fa-circle-check"
                  tone="emerald"
                />
                <OverviewMetric
                  label="รอติดตาม"
                  value={summary.pendingCount}
                  helper="ประเมิน/ปรับปรุง"
                  icon="fa-hourglass-half"
                  tone="amber"
                />
              </div>
            </div>
          </div>
        </div>

        <aside className={`border-t p-4 sm:p-5 lg:border-l lg:border-t-0 lg:p-6 ${insight.surface}`} aria-label="ข้อเสนอแนะจากผลการประเมิน">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm shadow-sm ${insight.iconSurface}`} aria-hidden="true">
            <i className={`fa-solid ${insight.icon}`}></i>
          </span>
          <p className={`mt-4 text-[10px] font-bold uppercase tracking-[0.14em] ${insight.eyebrowTone}`}>{insight.eyebrow}</p>
          <h4 className={`font-display mt-1.5 text-lg font-bold leading-snug ${insight.titleTone}`}>{insight.title}</h4>
          <p className="mt-2 text-xs leading-5 text-slate-600">{insight.description}</p>

          <div className="mt-5 rounded-xl border border-white/70 bg-white/70 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-500">
              <span>เป้าหมายขั้นต่ำ</span>
              <strong className="text-slate-800">{targetClinicCount} แห่ง</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-500">
              <span>ผลปัจจุบัน</span>
              <strong className={summary.isTargetAchieved ? 'text-emerald-700' : 'text-amber-700'}>{summary.passedCount} แห่ง</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5 lg:px-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-700">ความก้าวหน้าเทียบเกณฑ์</p>
            <p className="mt-0.5 text-[9px] text-slate-400">สเกลจริง 0–100%</p>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">
            ผ่านแล้ว <strong className="text-slate-800">{summary.passedCount}/{summary.totalClinics}</strong> แห่ง
          </span>
        </div>
        <ProgressScale
          value={summary.passPercentage}
          target={summary.targetPercentage}
          achieved={summary.isTargetAchieved}
          ariaLabel={`ความก้าวหน้าการผ่านเกณฑ์ RDU อำเภอ${summary.district}`}
        />
      </div>
    </section>
  );
};
