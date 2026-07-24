import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Database,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react';
import { ProvincialSummary } from '../types';

interface LandingPageProps {
  summary: ProvincialSummary;
  userRole: 'admin' | 'user';
  onNavigateToDashboard: () => void;
  onOpenAdminLogin: () => void;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: 'slate' | 'sky' | 'emerald' | 'amber';
}

const metricToneClasses = {
  slate: {
    icon: 'bg-slate-100 text-slate-700',
    value: 'text-slate-950',
  },
  sky: {
    icon: 'bg-sky-50 text-sky-700',
    value: 'text-sky-800',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700',
    value: 'text-emerald-700',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700',
    value: 'text-amber-700',
  },
} as const;

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  tone,
}) => {
  const colors = metricToneClasses[tone];

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">{label}</h3>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 flex flex-wrap items-baseline gap-1 text-2xl font-bold tracking-tight sm:text-3xl ${colors.value}`}>
        {value}
        {unit && <span className="text-xs font-medium text-slate-500 sm:text-sm">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[11px] leading-5 text-slate-500 sm:text-xs">{detail}</p>
    </article>
  );
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

export const LandingPage: React.FC<LandingPageProps> = ({
  summary,
  userRole,
  onNavigateToDashboard,
  onOpenAdminLogin,
}) => {
  const assessedPercentage = summary.totalTargetClinics > 0
    ? (summary.assessedClinics / summary.totalTargetClinics) * 100
    : 0;
  const overallPercentage = clampPercentage(summary.overallPassPercentage);
  const remainingClinics = Math.max(summary.totalTargetClinics - summary.assessedClinics, 0);
  const isAdmin = userRole === 'admin';

  return (
    <div id="top" className="overflow-hidden bg-slate-50 text-slate-800">
      <section className="relative isolate border-b border-slate-200/70 bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-24 -top-32 size-[30rem] rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-48 left-1/4 size-[28rem] rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:52px_52px] opacity-[0.2]" />
        </div>

        <div className="mx-auto grid min-h-[620px] w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 sm:text-sm">
              <Sparkles className="size-4" aria-hidden="true" />
              <span>RDU Clinics • จังหวัดสตูล 2569</span>
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-[1.16] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.6rem]">
              ทุกคลินิกใช้ยา
              <span className="block text-emerald-700">อย่างสมเหตุผล</span>
              ด้วยข้อมูลที่เห็นภาพเดียวกัน
            </h1>

            <p className="mt-6 max-w-2xl text-base font-light leading-8 text-slate-600 sm:text-lg">
              ระบบติดตามผลการประเมิน RDU Clinics สำหรับคลินิกเอกชนทั้ง 7 อำเภอ
              ช่วยให้เจ้าหน้าที่เห็นความก้าวหน้า ติดตามเป้าหมาย และตัดสินใจจากข้อมูลล่าสุดได้ง่ายขึ้น
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl"
              >
                <LayoutDashboard className="size-5" aria-hidden="true" />
                ดูแดชบอร์ดภาพรวม
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={isAdmin ? onNavigateToDashboard : onOpenAdminLogin}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              >
                {isAdmin ? (
                  <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <LockKeyhole className="size-5 text-slate-500" aria-hidden="true" />
                )}
                {isAdmin ? 'เข้าสู่ระบบแล้ว — เปิดพื้นที่จัดการ' : 'เข้าสู่ระบบเจ้าหน้าที่'}
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-600" aria-hidden="true" />
                ครอบคลุม 7 อำเภอ
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-600" aria-hidden="true" />
                ติดตามผลแบบรวมศูนย์
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
                จำกัดสิทธิ์ข้อมูลสำคัญ
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:ml-auto">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/50 via-white to-sky-100 blur-2xl" aria-hidden="true" />
            <div className="rounded-[2rem] border border-white/90 bg-white/95 p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Provincial snapshot</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">ภาพรวมจังหวัดวันนี้</h2>
                  <p className="mt-1 text-xs text-slate-500">ผลการประเมินคลินิกเอกชนล่าสุดในระบบ</p>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <BarChart3 className="size-5" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-7 grid items-center gap-7 sm:grid-cols-[160px_1fr]">
                <div
                  className="relative mx-auto flex size-40 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#047857 ${overallPercentage * 3.6}deg, #e2e8f0 0deg)`,
                  }}
                  role="img"
                  aria-label={`ผ่านเกณฑ์ RDU ร้อยละ ${summary.overallPassPercentage}`}
                >
                  <div className="flex size-[124px] flex-col items-center justify-center rounded-full bg-white shadow-inner">
                    <span className="text-3xl font-bold tracking-tight text-slate-950">{summary.overallPassPercentage}%</span>
                    <span className="mt-0.5 text-xs font-medium text-slate-500">ผ่านเกณฑ์ RDU</span>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                  <div className="rounded-2xl bg-emerald-50 p-3.5">
                    <dt className="text-xs font-medium text-emerald-800">ผ่านเกณฑ์แล้ว</dt>
                    <dd className="mt-1 text-2xl font-bold text-emerald-800">
                      {summary.passedClinics}
                      <span className="ml-1 text-xs font-medium">แห่ง</span>
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3.5">
                    <dt className="text-xs font-medium text-slate-600">รอรับการประเมิน</dt>
                    <dd className="mt-1 text-2xl font-bold text-slate-900">
                      {remainingClinics}
                      <span className="ml-1 text-xs font-medium">แห่ง</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="font-medium text-slate-600">เป้าหมายระดับจังหวัด</span>
                  <span className={`font-semibold ${summary.isProvinceTargetAchieved ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {summary.isProvinceTargetAchieved ? 'บรรลุเป้าหมายแล้ว' : `เป้าหมาย ${summary.overallTargetPercentage}%`}
                  </span>
                </div>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="ความก้าวหน้าผลการประเมินระดับจังหวัด"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={overallPercentage}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400"
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="province-overview" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">ข้อมูลสำคัญในมุมเดียว</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">สถานการณ์ RDU ภาพรวมจังหวัด</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              ตัวเลขคำนวณจากข้อมูลคลินิกในระบบ และเปลี่ยนตามผลการประเมินล่าสุด
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard
              label="คลินิกเป้าหมาย"
              value={summary.totalTargetClinics}
              unit="แห่ง"
              detail="รวมคลินิกเอกชนทั้ง 7 อำเภอ"
              icon={Building2}
              tone="slate"
            />
            <MetricCard
              label="ประเมินแล้ว"
              value={summary.assessedClinics}
              unit="แห่ง"
              detail={`คิดเป็น ${assessedPercentage.toFixed(1)}% ของทั้งหมด`}
              icon={ClipboardCheck}
              tone="sky"
            />
            <MetricCard
              label="ผ่านเกณฑ์ RDU"
              value={summary.passedClinics}
              unit="แห่ง"
              detail="ผลประเมินตั้งแต่ระดับ 2 ขึ้นไป"
              icon={CheckCircle2}
              tone="emerald"
            />
            <MetricCard
              label="สัดส่วนผ่านเกณฑ์"
              value={`${summary.overallPassPercentage}%`}
              detail={summary.isProvinceTargetAchieved ? 'บรรลุเป้าหมายระดับจังหวัดแล้ว' : `กำลังมุ่งสู่เป้าหมาย ${summary.overallTargetPercentage}%`}
              icon={Target}
              tone={summary.isProvinceTargetAchieved ? 'emerald' : 'amber'}
            />
          </div>
        </div>
      </section>

      <section id="district-progress" className="scroll-mt-24 border-y border-slate-200/70 bg-white py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <MapPinned className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-5 text-sm font-semibold text-emerald-700">7 อำเภอ จังหวัดสตูล</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              เห็นความก้าวหน้า<br className="hidden lg:block" />ของทุกพื้นที่
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              เปรียบเทียบสัดส่วนคลินิกที่ผ่านเกณฑ์รายอำเภอ เพื่อช่วยจัดลำดับพื้นที่ที่ควรติดตามและสนับสนุนเพิ่มเติม
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700">
              <Target className="size-4 text-emerald-700" aria-hidden="true" />
              เส้นเป้าหมาย {summary.overallTargetPercentage}%
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {summary.districtSummaries.map((district) => {
              const percentage = clampPercentage(district.passPercentage);
              const statusText = district.isTargetAchieved
                ? 'ถึงเป้าหมาย'
                : `อีก ${Math.max(district.targetPercentage - district.passPercentage, 0).toFixed(1)}%`;

              return (
                <article
                  key={district.district}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-950">อำเภอ{district.district}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        ผ่าน {district.passedCount} จาก {district.totalClinics} แห่ง
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${district.isTargetAchieved ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {district.passPercentage}%
                      </p>
                      <p className={`mt-0.5 text-[11px] font-semibold ${district.isTargetAchieved ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {statusText}
                      </p>
                    </div>
                  </div>

                  <div
                    className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label={`อำเภอ${district.district} ผ่านเกณฑ์ร้อยละ ${district.passPercentage}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                  >
                    <div
                      className={`h-full rounded-full ${district.isTargetAchieved ? 'bg-emerald-600' : 'bg-amber-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                    <span
                      className="absolute inset-y-0 w-0.5 bg-slate-700/60"
                      style={{ left: `${clampPercentage(district.targetPercentage)}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-emerald-700">ออกแบบเพื่อการทำงานจริง</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">จากข้อมูลจำนวนมาก สู่การตัดสินใจที่ง่ายขึ้น</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              ทุกส่วนของระบบช่วยลดเวลารวบรวมข้อมูล และทำให้ทีมเห็นประเด็นที่ต้องดำเนินการต่อได้ชัดเจน
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: 'เห็นภาพรวมได้ทันที',
                description: 'สรุปจำนวนคลินิก ผลการประเมิน และเป้าหมายรายพื้นที่ในหน้าจอเดียว',
                tone: 'bg-emerald-100 text-emerald-700',
              },
              {
                icon: RefreshCw,
                title: 'ติดตามต่อเนื่องเป็นระบบ',
                description: 'ข้อมูลแยกตามอำเภอช่วยให้ทีมเลือกพื้นที่ติดตามและวางแผนสนับสนุนได้ตรงจุด',
                tone: 'bg-sky-100 text-sky-700',
              },
              {
                icon: ShieldCheck,
                title: 'จัดการข้อมูลอย่างมั่นใจ',
                description: 'ผู้ใช้งานทั่วไปดูผลภาพรวมได้ ส่วนการแก้ไขข้อมูลสงวนไว้สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์',
                tone: 'bg-violet-100 text-violet-700',
              },
            ].map(({ icon: Icon, title, description, tone }) => (
              <article
                key={title}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-900/5"
              >
                <span className={`flex size-12 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
                >
                  สำรวจข้อมูล
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="rdu-levels" className="scroll-mt-24 bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                <HeartPulse className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-5 text-sm font-semibold text-emerald-300">เกณฑ์ที่เข้าใจง่าย</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">ระดับผลการประเมิน RDU Clinics</h2>
              <p className="mt-4 max-w-lg text-sm font-light leading-7 text-slate-300">
                ระบบจัดกลุ่มผลการประเมินเป็น 3 ระดับ เพื่อให้เห็นทั้งพื้นที่ที่ต้องพัฒนา พื้นที่ที่ผ่านเกณฑ์ และต้นแบบที่พร้อมถ่ายทอดแนวทาง
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  level: '01',
                  title: 'ระดับ 1',
                  badge: 'ควรพัฒนา',
                  description: 'ประเมินตนเองแล้ว และอยู่ระหว่างปรับปรุงระบบการใช้ยาและการสื่อสารกับผู้รับบริการ',
                  accent: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
                },
                {
                  level: '02',
                  title: 'ระดับ 2',
                  badge: 'ผ่านเกณฑ์',
                  description: 'มีระบบควบคุมการใช้ยาอย่างสมเหตุผล และดำเนินงานตามมาตรฐาน RDU Clinics',
                  accent: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
                },
                {
                  level: '03',
                  title: 'ระดับ 3',
                  badge: 'ต้นแบบ',
                  description: 'มีระบบดำเนินงานที่เข้มแข็ง บันทึกข้อมูลเป็นระบบ และพร้อมเป็นต้นแบบด้าน RDU',
                  accent: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
                },
              ].map((item) => (
                <article key={item.level} className="grid grid-cols-[48px_1fr] gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:grid-cols-[56px_1fr_auto] sm:items-center sm:p-5">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-slate-300 sm:size-14">
                    {item.level}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs font-light leading-6 text-slate-400 sm:text-sm">{item.description}</p>
                  </div>
                  <span className={`col-start-2 w-fit rounded-full border px-3 py-1 text-xs font-semibold sm:col-start-auto ${item.accent}`}>
                    {item.badge}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-emerald-700 px-5 py-10 text-white shadow-xl shadow-emerald-900/15 sm:px-10 sm:py-14 lg:px-16">
            <div className="pointer-events-none absolute -right-24 -top-32 -z-10 size-80 rounded-full border-[48px] border-white/10" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-teal-400/20 blur-3xl" aria-hidden="true" />
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <UsersRound className="size-4" aria-hidden="true" />
                  ขับเคลื่อน RDU ไปด้วยกัน
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">พร้อมดูความก้าวหน้าของคลินิกในจังหวัดสตูลแล้วหรือยัง?</h2>
                <p className="mt-3 text-sm font-light leading-7 text-emerald-50">
                  เปิดแดชบอร์ดเพื่อสำรวจข้อมูลภาพรวมและรายอำเภอ หรือเข้าสู่ระบบเจ้าหน้าที่เพื่อจัดการข้อมูลที่ได้รับมอบหมาย
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50"
                >
                  <Database className="size-5" aria-hidden="true" />
                  เปิดแดชบอร์ด
                </button>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdminLogin}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    <LockKeyhole className="size-5" aria-hidden="true" />
                    เข้าสู่ระบบเจ้าหน้าที่
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
