import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Users,
  ClipboardCheck,
  Banknote,
  Landmark,
  ShieldCheck,
  Package,
  FileText,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useApp } from '../../services/store';
import { getDefaultRouteForUser } from '../../permissions/permissions';
import {
  formatCurrency,
  formatCurrencyExact,
  getStudentFinancialSummary,
} from '../../calculations/paymentEngine';
import { Badge, Button, Card, LVBMonogram } from '../../components/ui/Primitives';

const LOADER_SESSION_KEY = 'lvb_pulse_loader_shown';

export const LandingPage: React.FC = () => {
  const { state, selectUser, setLanguage, t } = useApp();
  const navigate = useNavigate();

  const [showLoader, setShowLoader] = useState(() => {
    try {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return false;
      return !sessionStorage.getItem(LOADER_SESSION_KEY);
    } catch {
      return false;
    }
  });
  const [loaderFading, setLoaderFading] = useState(false);
  const [activeLoopStep, setActiveLoopStep] = useState(0);
  const [previewTab, setPreviewTab] = useState<
    'students' | 'class_log' | 'collections' | 'inventory' | 'reports'
  >('students');

  useEffect(() => {
    if (!showLoader) return;
    const t1 = window.setTimeout(() => setLoaderFading(true), 850);
    const t2 = window.setTimeout(() => {
      setShowLoader(false);
      try {
        sessionStorage.setItem(LOADER_SESSION_KEY, '1');
      } catch {
        // ignore
      }
    }, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [showLoader]);

  const enterAsUser = (userId: string) => {
    const user = state.users.find((u) => u.id === userId);
    if (!user) return;
    selectUser(user.id);
    navigate(getDefaultRouteForUser(user));
  };

  const moneyLoopStages = [
    {
      step: '01',
      title: state.language === 'es' ? 'Pago de Alumna' : 'Student Payment',
      icon: CreditCard,
      headline:
        state.language === 'es'
          ? 'Cuotas dinámicas calculadas con precisión'
          : 'Dynamic weekly dues calculated automatically',
      detail:
        state.language === 'es'
          ? 'A partir de $250 totales ($50 depósito + $50 primera clase), el motor recalcula automáticamente cada cuota semanal (5 × $30). Si paga de más, las siguientes cuotas bajan; si falta, se redistribuyen sin errores.'
          : 'Starting from course total, confirmed deposit, and prior payments, LVB Pulse dynamically recalculates every student’s weekly due amount. Overpayments lower future dues; missed weeks carry forward cleanly.',
      meta: 'due_w = (total − deposit − paid_before_w) / (weeks − w + 1)',
    },
    {
      step: '02',
      title: state.language === 'es' ? 'Cobro por Instructora' : 'Instructor Collection',
      icon: ClipboardCheck,
      headline:
        state.language === 'es'
          ? 'Registro rápido en clase desde el teléfono'
          : 'One-tap studio collection during class',
      detail:
        state.language === 'es'
          ? 'Marisol o Julietha marcan asistencia en un toque y registran efectivo, tarjeta, Zelle, Venmo o Cash App con recibo secuencial LVB-000XX.'
          : 'Instructors mark Present/Absent/Cancelled/Excused in one tap and collect cash, card, Zelle, Venmo, or Cash App with sequential LVB-000XX receipt numbering.',
      meta: 'Sequential receipts: LVB-00031, LVB-00032, LVB-00033...',
    },
    {
      step: '03',
      title: state.language === 'es' ? 'Entrega de Efectivo' : 'Cash Handoff',
      icon: Banknote,
      headline:
        state.language === 'es'
          ? 'Corte diario vinculado al efectivo físico'
          : 'Daily cash envelope tied to individual receipts',
      detail:
        state.language === 'es'
          ? 'Al terminar la clase, la instructora revisa su desglose diario (efectivo vs. tarjeta/digital) y envía la Entrega de Efectivo para revisión del propietario.'
          : 'At the end of class, the instructor reviews their daily breakdown (cash vs. card/digital) and submits a formal Cash Handoff with a printable Daily Cash Report.',
      meta: 'Status: Pending Owner Confirmation',
    },
    {
      step: '04',
      title: state.language === 'es' ? 'Confirmación de Propietario' : 'Owner Confirmation',
      icon: ShieldCheck,
      headline:
        state.language === 'es'
          ? 'Verificación de efectivo y bloqueo de registros'
          : 'Cash verification, variance check & entry locking',
      detail:
        state.language === 'es'
          ? 'Rudy o Sidney cuentan el efectivo recibido, registran cualquier diferencia con nota obligatoria y confirman. Las entradas confirmadas quedan bloqueadas.'
          : 'Rudy or Sidney verifies physical cash received, records any variance with a mandatory discrepancy note, and confirms. Confirmed cash entries become locked against edits.',
      meta: 'Confirmed Cash → Permanently Locked',
    },
    {
      step: '05',
      title: state.language === 'es' ? 'Contabilidad' : 'Accounting',
      icon: Landmark,
      headline:
        state.language === 'es'
          ? 'Inteligencia financiera en tiempo real'
          : 'Real-time academy ledger & branded PDF/CSV reports',
      detail:
        state.language === 'es'
          ? 'Cada cobro, depósito confirmado y entrega alimenta automáticamente el panel de propietarios, los saldos pendientes, la conciliación y las exportaciones PDF/CSV.'
          : 'Every verified payment, deposit, and locked handoff automatically feeds the Owner Dashboard, student behind-schedule tracking, cash reconciliation, and PDF/CSV reporting.',
      meta: 'Single source of truth · Zero duplicate spreadsheets',
    },
  ];

  const activeStage = moneyLoopStages[activeLoopStep];

  return (
    <div className="min-h-screen bg-porcelain text-navy">
      {/* Branded Initial Loader */}
      {showLoader && (
        <div
          className={`fixed inset-0 z-[100] bg-porcelain flex flex-col items-center justify-center px-6 transition-opacity duration-350 ${
            loaderFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="Loading LVB Pulse"
        >
          <div className="flex flex-col items-center animate-fade-in">
            <LVBMonogram size="lg" />
            <div className="font-editorial text-3xl text-navy mt-4 tracking-wide">
              LVB Pulse
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mt-1.5">
              La Voute Beauty Academy
            </div>
            <div className="w-40 h-[2px] bg-borderwarm mt-6 overflow-hidden rounded-full">
              <div className="h-full bg-champagne animate-progress-line" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar over Hero */}
      <header className="sticky top-0 z-40 bg-navy/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LVBMonogram size="sm" />
            <div>
              <div className="font-editorial text-lg leading-none text-white">
                LVB Pulse
              </div>
              <div className="text-[9.5px] uppercase tracking-[0.16em] text-champagne-soft mt-0.5 hidden sm:block">
                La Voute Beauty Academy
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-white/75">
            <a href="#platform" className="hover:text-white transition-colors">
              {state.language === 'es' ? 'Plataforma' : 'Platform'}
            </a>
            <a href="#money-loop" className="hover:text-white transition-colors">
              {state.language === 'es' ? 'Ciclo Financiero' : 'Money Loop'}
            </a>
            <a href="#roles" className="hover:text-white transition-colors">
              {state.language === 'es' ? 'Roles' : 'Four Roles'}
            </a>
            <a href="#preview" className="hover:text-white transition-colors">
              {state.language === 'es' ? 'Vista Operativa' : 'Live Preview'}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/15 bg-navy-deep p-0.5">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md ${
                  state.language === 'en' ? 'bg-champagne text-white' : 'text-white/70'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md ${
                  state.language === 'es' ? 'bg-champagne text-white' : 'text-white/70'
                }`}
              >
                ES
              </button>
            </div>
            <Button
              size="sm"
              variant="champagne"
              onClick={() => navigate('/app')}
            >
              {t('enterApp')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-[82vh] flex items-center overflow-hidden bg-navy">
        <img
          src="/images/hero-studio.jpg"
          alt="La Voute Beauty Academy Nail Studio"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/45"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 w-full">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-soft mb-5">
              <span className="w-6 h-[1px] bg-champagne" />
              {t('landingEyebrow')}
            </div>

            <h1 className="font-editorial text-[44px] sm:text-[58px] lg:text-[66px] leading-[1.04] text-white tracking-tight">
              {t('landingHeadlineLine1')}
              <br />
              <span className="text-champagne-soft">{t('landingHeadlineLine2')}</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-white/80 leading-relaxed max-w-xl">
              {t('landingSubtitle')}
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                size="lg"
                variant="champagne"
                onClick={() => navigate('/app')}
                className="h-12 px-7 text-sm"
              >
                {t('landingPrimaryCta')}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <a
                href="#platform"
                className="h-12 px-6 rounded-lg border border-white/25 text-white hover:bg-white/10 transition-colors inline-flex items-center justify-center text-sm font-medium"
              >
                {t('landingSecondaryCta')}
              </a>
            </div>

            {/* Restrained single-line academy status detail */}
            <div className="mt-12 pt-6 border-t border-white/15 inline-flex items-center gap-2.5 text-xs text-white/70">
              <span className="w-2 h-2 rounded-full bg-sage" />
              <span>{t('landingStatusLive')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION A: THE PLATFORM INTRODUCTION (4 PILLARS) */}
      <section id="platform" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-12">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne mb-2.5">
            {state.language === 'es' ? 'ECOSISTEMA OPERATIVO' : 'OPERATIONAL ECOSYSTEM'}
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl text-navy leading-tight">
            {t('landingPillarsTitle')}
          </h2>
          <p className="text-sm sm:text-base text-slatewarm mt-3 leading-relaxed">
            {t('landingPillarsSub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              img: '/images/pillar-students.jpg',
              num: '01',
              title: t('pillar1Title'),
              desc: t('pillar1Desc'),
              badge: '14 Seeded Students · 4-Step Checklist',
            },
            {
              img: '/images/pillar-classes.jpg',
              num: '02',
              title: t('pillar2Title'),
              desc: t('pillar2Desc'),
              badge: 'One-Tap Mobile Class Log',
            },
            {
              img: '/images/pillar-operations.jpg',
              num: '03',
              title: t('pillar3Title'),
              desc: t('pillar3Desc'),
              badge: 'Sequential LVB Receipts & Cash Locking',
            },
            {
              img: '/images/hero-studio.jpg',
              num: '04',
              title: t('pillar4Title'),
              desc: t('pillar4Desc'),
              badge: '101 Inventory Items · Tours · Reports',
            },
          ].map((pillar) => (
            <Card key={pillar.num} className="overflow-hidden flex flex-col">
              <div className="h-52 bg-ivory relative overflow-hidden">
                <img
                  src={pillar.img}
                  alt={pillar.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <Badge tone="navy" className="bg-navy/90 border-white/15">
                    {pillar.num}
                  </Badge>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-editorial text-2xl text-navy">{pillar.title}</h3>
                  <p className="text-sm text-slatewarm mt-2 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-borderwarm text-xs font-medium text-champagne">
                  {pillar.badge}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION B: THE INTERACTIVE MONEY LOOP */}
      <section
        id="money-loop"
        className="py-20 sm:py-24 bg-ivory border-y border-borderwarm px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne mb-2.5">
              {t('moneyLoopEyebrow')}
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl text-navy leading-tight">
              {t('moneyLoopTitle')}
            </h2>
            <p className="text-sm sm:text-base text-slatewarm mt-3 leading-relaxed">
              {t('moneyLoopSub')}
            </p>
          </div>

          {/* 5 Interactive Stage Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-6">
            {moneyLoopStages.map((stage, idx) => {
              const Icon = stage.icon;
              const active = idx === activeLoopStep;
              return (
                <button
                  key={stage.step}
                  type="button"
                  onClick={() => setActiveLoopStep(idx)}
                  className={`p-4 rounded-card border text-left transition-all duration-150 ${
                    active
                      ? 'bg-navy text-white border-navy shadow-card'
                      : 'bg-white text-navy border-borderwarm hover:border-champagne'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[11px] font-mono ${
                        active ? 'text-champagne-soft' : 'text-slatewarm'
                      }`}
                    >
                      {stage.step}
                    </span>
                    <Icon
                      className={`w-4 h-4 ${active ? 'text-champagne-soft' : 'text-champagne'}`}
                    />
                  </div>
                  <div className="text-sm font-semibold leading-snug">{stage.title}</div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Explanation Panel */}
          <Card className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <Badge tone="champagne">
                Stage {activeStage.step} · {activeStage.title}
              </Badge>
              <h3 className="font-editorial text-2xl sm:text-3xl text-navy">
                {activeStage.headline}
              </h3>
              <p className="text-sm text-slatewarm leading-relaxed">
                {activeStage.detail}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-porcelain border border-borderwarm lg:min-w-[300px] shrink-0">
              <div className="text-[10.5px] uppercase tracking-wider text-slatewarm font-semibold">
                {state.language === 'es' ? 'Regla del Sistema' : 'System Guarantee'}
              </div>
              <div className="font-mono text-xs text-navy mt-1.5 leading-relaxed">
                {activeStage.meta}
              </div>
              <Button
                size="sm"
                className="mt-4 w-full"
                onClick={() => navigate('/app')}
              >
                {state.language === 'es' ? 'Probar en el Demo' : 'Try This Workflow Live'}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION C: ONE ACADEMY, FOUR ROLES */}
      <section id="roles" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-12">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne mb-2.5">
            {t('rolesEyebrow')}
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl text-navy leading-tight">
            {t('rolesTitle')}
          </h2>
          <p className="text-sm sm:text-base text-slatewarm mt-3 leading-relaxed">
            {t('rolesSub')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              role: t('role_owner'),
              people: 'Rudy Figueroa · Sidney Figueroa',
              userId: 'user-rudy',
              cta: state.language === 'es' ? 'Entrar como Rudy' : 'Explore as Rudy',
              points: [
                'Owner Dashboard & Accounting',
                'Confirm & Lock Cash Handoffs',
                'Confirm Deposits & Clear Makeups',
                'Full Inventory Valuation & Projects',
              ],
            },
            {
              role: t('role_instructor'),
              people: 'Marisol · Julietha Delgado',
              userId: 'user-marisol',
              cta: state.language === 'es' ? 'Entrar como Marisol' : 'Explore as Marisol',
              points: [
                'Assigned Classes & Attendance Only',
                'Collect Weekly Payments & Deposits',
                'Submit Daily Cash Reports & Handoffs',
                'Schedule Makeups & Counts-Only Stock',
              ],
            },
            {
              role: t('role_telemarketing'),
              people: 'Jessica',
              userId: 'user-jessica',
              cta: state.language === 'es' ? 'Entrar como Jessica' : 'Explore as Jessica',
              points: [
                'Enroll & Edit Students (4-Step Check)',
                'Book & Update Studio Tours',
                'Take Deposits & View Missed Classes',
                'Policy-Controlled Balance Visibility',
              ],
            },
            {
              role: t('role_staff'),
              people: 'Lizy Amador',
              userId: 'user-lizy',
              cta: state.language === 'es' ? 'Entrar como Lizy' : 'Explore as Lizy',
              points: [
                'Front-Desk Tours & Basic Student Info',
                'Update 101-Item Inventory Counts',
                'Private Weekly Reports & Tasks',
                'Zero Financial or Valuation Exposure',
              ],
            },
          ].map((item) => (
            <Card key={item.userId} className="p-5 flex flex-col justify-between gap-5">
              <div>
                <Badge tone="champagne">{item.role}</Badge>
                <h3 className="font-editorial text-2xl text-navy mt-3">{item.role}</h3>
                <p className="text-xs font-medium text-slatewarm mt-0.5">{item.people}</p>
                <ul className="mt-4 space-y-2 text-xs text-navy">
                  {item.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sage-dark shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => enterAsUser(item.userId)}
              >
                {item.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION D: CURATED LIVE OPERATIONAL PREVIEW (Real App Data!) */}
      <section
        id="preview"
        className="py-20 sm:py-24 bg-white border-t border-borderwarm px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne mb-2">
                {t('previewEyebrow')}
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl text-navy">
                {t('previewTitle')}
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-porcelain border border-borderwarm rounded-xl p-1 overflow-x-auto">
              {(
                [
                  ['students', 'Students', Users],
                  ['class_log', 'Class Log', ClipboardCheck],
                  ['collections', 'Collections', CreditCard],
                  ['inventory', 'Inventory', Package],
                  ['reports', 'Reports', FileText],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreviewTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    previewTab === key ? 'bg-navy text-white' : 'text-slatewarm hover:text-navy'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Card className="bg-porcelain p-4 sm:p-6">
            {previewTab === 'students' && (
              <div className="space-y-2.5">
                {state.students.slice(0, 4).map((stu) => {
                  const cls = state.classes.find((c) => c.id === stu.classId);
                  const fin = getStudentFinancialSummary(stu, cls, state.payments, state.deposits);
                  return (
                    <div
                      key={stu.id}
                      className="bg-white border border-borderwarm rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-navy text-sm">{stu.fullName}</span>
                        <div className="text-slatewarm">{cls?.name} · {stu.source}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone={stu.enrollmentStatus === 'enrolled' ? 'sage' : 'amber'}>
                          {stu.enrollmentStatus === 'enrolled' ? 'Fully Enrolled' : 'Pending'}
                        </Badge>
                        <span className="font-semibold text-navy tabular-nums">
                          Paid {formatCurrency(fin.totalPaid)} / {formatCurrency(fin.courseTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {previewTab === 'class_log' && (
              <div className="space-y-2.5">
                {state.students
                  .filter((s) => s.classId === 'class-tue-nails')
                  .slice(0, 4)
                  .map((stu) => {
                    const cls = state.classes[0];
                    const fin = getStudentFinancialSummary(stu, cls, state.payments, state.deposits, 4);
                    return (
                      <div
                        key={stu.id}
                        className="bg-white border border-borderwarm rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-navy text-sm">{stu.fullName}</div>
                          <div className="text-slatewarm">
                            Due Week 4: {formatCurrencyExact(fin.dueThisWeek)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {['P', 'A', 'C', 'E'].map((code, i) => (
                            <span
                              key={code}
                              className={`w-7 h-7 rounded-md text-xs font-semibold flex items-center justify-center ${
                                i === 0
                                  ? 'bg-sage-dark text-white'
                                  : 'bg-porcelain text-slatewarm border border-borderwarm'
                              }`}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {previewTab === 'collections' && (
              <div className="space-y-2.5">
                {state.payments.slice(-4).reverse().map((p) => {
                  const stu = state.students.find((s) => s.id === p.studentId);
                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-borderwarm rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-mono font-semibold text-navy">{p.receiptNumber}</span> ·{' '}
                        <span className="font-medium text-navy">{stu?.fullName}</span>
                        <div className="text-slatewarm">{p.date} · {p.collectorName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="champagne">{p.method}</Badge>
                        {p.locked && <Lock className="w-3.5 h-3.5 text-champagne" />}
                        <span className="font-semibold text-navy tabular-nums">
                          {formatCurrencyExact(p.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {previewTab === 'inventory' && (
              <div className="space-y-2.5">
                {state.inventory
                  .filter((i) => i.quantity <= 5)
                  .slice(0, 4)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-borderwarm rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-navy text-sm">{item.name}</div>
                        <div className="text-slatewarm">{item.category} · {item.supplier}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="terracotta">Order Now ({item.quantity} left)</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {previewTab === 'reports' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { title: 'Collections PDF & CSV', meta: `${state.payments.length} live ledger entries` },
                  { title: 'Daily Cash Sheet PDF', meta: 'Printable collector signature lines' },
                  { title: 'Student Balances & Behind', meta: 'Dynamic formula across 14 students' },
                ].map((r) => (
                  <div key={r.title} className="bg-white border border-borderwarm rounded-xl p-4">
                    <div className="font-semibold text-navy text-sm">{r.title}</div>
                    <div className="text-slatewarm mt-1">{r.meta}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button onClick={() => navigate('/app')}>
                {state.language === 'es' ? 'Abrir Aplicación Interactiva' : 'Open Full Interactive Application'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION E: FINAL CTA */}
      <section className="py-20 bg-navy text-white px-4 sm:px-6 lg:px-8 border-t border-champagne/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-12 h-[1px] bg-champagne mx-auto mb-6" />
          <h2 className="font-editorial text-3xl sm:text-5xl leading-tight text-white">
            {t('finalCtaTitle')}
          </h2>
          <p className="text-sm sm:text-base text-white/70 mt-4 max-w-xl mx-auto">
            {state.language === 'es'
              ? 'Explora los cuatro roles, prueba el ciclo completo de pagos y entregas de efectivo, y exporta reportes PDF en vivo.'
              : 'Explore all four operational roles, test the end-to-end money loop, and generate live branded PDF receipts and reports.'}
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              variant="champagne"
              onClick={() => navigate('/app')}
              className="h-12 px-8 text-sm"
            >
              {t('finalCtaButton')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION F: FOOTER */}
      <footer className="bg-navy-deep text-white/75 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-3">
              <LVBMonogram size="sm" />
              <div>
                <div className="font-editorial text-lg text-white leading-none">
                  LVB Pulse
                </div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-champagne-soft mt-0.5">
                  La Voute Beauty Academy LLC
                </div>
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              {t('footerDisclaimer')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
                Platform
              </div>
              <a href="#platform" className="block hover:text-white">
                Overview
              </a>
              <a href="#money-loop" className="block hover:text-white">
                Money Loop
              </a>
              <a href="#roles" className="block hover:text-white">
                Four Roles
              </a>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
                Demonstration
              </div>
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="block hover:text-white text-left"
              >
                {t('enterApp')}
              </button>
              <button
                type="button"
                onClick={() => enterAsUser('user-rudy')}
                className="block hover:text-white text-left"
              >
                Owner Demo (Rudy)
              </button>
              <button
                type="button"
                onClick={() => enterAsUser('user-marisol')}
                className="block hover:text-white text-left"
              >
                Instructor Demo (Marisol)
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-white/50">
          <span>© 2026 La Voute Beauty Academy LLC. LVB Pulse — Client Demonstration Edition.</span>
          <span>City Terrace, Los Angeles, California</span>
        </div>
      </footer>
    </div>
  );
};
