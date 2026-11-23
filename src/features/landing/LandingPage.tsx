import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Pause,
  Play,
  Menu,
  X,
  Lock,
  MapPin,
  Package,
  MessageSquareWarning,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../services/store';
import { getDefaultRouteForUser } from '../../permissions/permissions';
import {
  formatCurrency,
  formatCurrencyExact,
  getStudentFinancialSummary,
  roundCurrency,
} from '../../calculations/paymentEngine';
import { Badge, Button, LVBMonogram } from '../../components/ui/Primitives';
import { useReveal } from '../../hooks/useReveal';

const LOADER_KEY = 'lvb_pulse_v2_loader_seen';

export const LandingPage: React.FC = () => {
  const { state, selectUser, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [showLoader, setShowLoader] = useState(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      return !sessionStorage.getItem(LOADER_KEY);
    } catch {
      return false;
    }
  });
  const [loaderFading, setLoaderFading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);

  // Interactive landing demos (Section B: Live Class Log Simulator & Section C: Checklist)
  const [simAttendance, setSimAttendance] = useState<Record<string, 'P' | 'A' | 'C' | 'E'>>({
    'stu-02': 'P',
    'stu-03': 'A',
    'stu-04': 'P',
  });
  const [simChecks, setSimChecks] = useState([true, true, true, false]);
  const [calcMode, setCalcMode] = useState<'standard' | 'overpay' | 'skip'>('standard');

  const revOverview = useReveal<HTMLElement>();
  const revFeatures = useReveal<HTMLElement>();
  const revStudents = useReveal<HTMLElement>();
  const revFinance = useReveal<HTMLElement>();

  const calcSchedule =
    calcMode === 'overpay'
      ? [
          { label: 'Dep', amount: '$50', note: 'Confirmed' },
          { label: 'W1', amount: '$50', note: 'First class' },
          { label: 'W2', amount: '$50', note: '+$20 extra', accent: true },
          { label: 'W3', amount: '$25', note: 'Auto lowered', accent: true },
          { label: 'W4', amount: '$25', note: 'Auto lowered' },
          { label: 'W5', amount: '$25', note: 'Auto lowered' },
          { label: 'W6', amount: '$25', note: 'Balanced $250' },
        ]
      : calcMode === 'skip'
        ? [
            { label: 'Dep', amount: '$50', note: 'Confirmed' },
            { label: 'W1', amount: '$50', note: 'First class' },
            { label: 'W2', amount: '$0', note: 'Absent', accent: true },
            { label: 'W3', amount: '$37.50', note: 'Carried forward', accent: true },
            { label: 'W4', amount: '$37.50', note: 'Adjusted' },
            { label: 'W5', amount: '$37.50', note: 'Adjusted' },
            { label: 'W6', amount: '$37.50', note: 'Balanced $250' },
          ]
        : [
            { label: 'Dep', amount: '$50', note: 'Confirmed' },
            { label: 'W1', amount: '$50', note: 'First class' },
            { label: 'W2', amount: '$30', note: 'Weekly' },
            { label: 'W3', amount: '$30', note: 'Weekly' },
            { label: 'W4', amount: '$30', note: 'Weekly' },
            { label: 'W5', amount: '$30', note: 'Weekly' },
            { label: 'W6', amount: '$30', note: 'Balanced $250' },
          ];

  useEffect(() => {
    if (!showLoader) return;
    const t1 = window.setTimeout(() => setLoaderFading(true), 700);
    const t2 = window.setTimeout(() => {
      setShowLoader(false);
      try {
        sessionStorage.setItem(LOADER_KEY, '1');
      } catch {
        // ignore
      }
    }, 1050);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [showLoader]);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setVideoPlaying(true);
    } else {
      v.pause();
      setVideoPlaying(false);
    }
  };

  const enterAsUser = (userId: string) => {
    const user = state.users.find((u) => u.id === userId);
    if (!user) return;
    selectUser(user.id);
    navigate(getDefaultRouteForUser(user));
  };

  // Real derived totals from shared demo dataset for Section D (Financial Visibility)
  const confirmedTotal = roundCurrency(
    state.payments
      .filter((p) => p.status === 'confirmed')
      .reduce((s, p) => s + p.amount, 0)
  );
  const outstandingTotal = roundCurrency(
    state.students.reduce((sum, stu) => {
      const cls = state.classes.find((c) => c.id === stu.classId);
      return (
        sum +
        getStudentFinancialSummary(stu, cls, state.payments, state.deposits)
          .remainingBalance
      );
    }, 0)
  );
  const lockedHandoffs = state.cashHandoffs.filter((h) => h.status === 'confirmed').length;
  const orderNowCount = state.inventory.filter((i) => i.quantity <= 5).length;

  const allSimChecksDone = simChecks.every(Boolean);

  return (
    <div className="min-h-screen bg-porcelain text-charcoal">
      {/* Short Refined Loading Transition (Section 6.1) */}
      {showLoader && (
        <div
          className={`fixed inset-0 z-[100] bg-porcelain flex flex-col items-center justify-center px-6 transition-opacity duration-350 ${
            loaderFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="Loading LVB Pulse"
        >
          <div className="flex flex-col items-center">
            <div className="font-editorial text-4xl sm:text-5xl text-charcoal tracking-tight">
              LVB Pulse
            </div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-olive mt-2">
              La Voute Beauty Academy
            </div>
            <div className="w-32 h-[1.5px] bg-hairline mt-6 overflow-hidden">
              <div className="h-full bg-olive animate-hairline" />
            </div>
          </div>
        </div>
      )}

      {/* Minimal Editorial Header (Section 6.2) */}
      <header className="sticky top-0 z-40 bg-porcelain/90 backdrop-blur-md border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2.5">
            <LVBMonogram size="sm" tone="olive" />
            <div className="leading-none">
              <span className="font-editorial text-xl text-charcoal block">LVB Pulse</span>
              <span className="text-[9.5px] uppercase tracking-[0.16em] text-softgray hidden sm:block mt-0.5">
                La Voute Beauty Academy
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-charcoal/75">
            <a href="#overview" className="hover:text-olive transition-colors">
              {state.language === 'es' ? 'Visión General' : 'Platform Overview'}
            </a>
            <a href="#features" className="hover:text-olive transition-colors">
              {state.language === 'es' ? 'Asistencia y Pagos' : 'Features'}
            </a>
            <a href="#operations" className="hover:text-olive transition-colors">
              {state.language === 'es' ? 'Operaciones' : 'Academy Operations'}
            </a>
            <a href="#team" className="hover:text-olive transition-colors">
              {state.language === 'es' ? 'Roles' : 'Team Roles'}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-hairline bg-white p-0.5">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md ${
                  state.language === 'en' ? 'bg-olive text-white' : 'text-softgray'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md ${
                  state.language === 'es' ? 'bg-olive text-white' : 'text-softgray'
                }`}
              >
                ES
              </button>
            </div>

            <Button size="sm" onClick={() => navigate('/app')} className="hidden sm:inline-flex">
              {t('landingPrimaryCta')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-charcoal hover:bg-mist"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-hairline bg-porcelain px-5 py-4 space-y-3 text-sm">
            <a
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 text-charcoal font-medium"
            >
              {state.language === 'es' ? 'Visión General' : 'Platform Overview'}
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 text-charcoal font-medium"
            >
              {state.language === 'es' ? 'Asistencia y Pagos' : 'Features'}
            </a>
            <a
              href="#operations"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 text-charcoal font-medium"
            >
              {state.language === 'es' ? 'Operaciones' : 'Academy Operations'}
            </a>
            <a
              href="#team"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 text-charcoal font-medium"
            >
              {state.language === 'es' ? 'Equipo y Roles' : 'Team Roles'}
            </a>
            <Button className="w-full" onClick={() => navigate('/app')}>
              {t('landingPrimaryCta')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </header>

      {/* HERO SECTION WITH LIVE MP4 VIDEO BACKGROUND (Section 1.1 & 6.3) */}
      <section className="relative min-h-[86vh] flex items-end sm:items-center overflow-hidden bg-charcoal">
        {/* Background Live MP4 Video with graceful static-image fallback */}
        {!videoFailed ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            poster="/images/hero-studio.jpg"
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-60 scale-[1.01]"
          >
            <source src="/videos/hero-atelier.mp4" type="video/mp4" />
          </video>
        ) : (
          <img
            src="/images/hero-studio.jpg"
            alt="La Voute Beauty Academy Studio"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-55"
          />
        )}

        {/* Calm Atelier Charcoal & Deep Olive Scrim */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/65 to-olive/45"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8 animate-fade-in">
              <div className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-mist mb-6">
                <span className="w-7 h-[1px] bg-clay" />
                {t('landingEyebrow')}
              </div>

              <h1 className="font-editorial text-[42px] sm:text-[58px] lg:text-[68px] leading-[1.03] text-porcelain tracking-tight">
                {t('landingHeadlineLine1')}
                <br />
                <span className="italic text-mist/90">{t('landingHeadlineLine2')}</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-mist/85 leading-relaxed max-w-xl">
                {t('landingSubtitle')}
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  size="lg"
                  variant="clay"
                  onClick={() => navigate('/app')}
                  className="h-12 px-7 text-sm"
                >
                  {t('landingPrimaryCta')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <a
                  href="#overview"
                  className="h-12 px-6 rounded-lg border border-porcelain/30 text-porcelain hover:bg-porcelain/10 transition-colors inline-flex items-center justify-center text-sm font-medium"
                >
                  {t('landingSecondaryCta')}
                </a>
              </div>
            </div>

            {/* Minimal Asymmetrical Atelier Pulse Readout + Ambient Video Control */}
            <div className="lg:col-span-4 lg:text-right flex flex-col lg:items-end gap-4">
              <div className="border-l-2 lg:border-l-0 lg:border-r-2 border-clay pl-4 lg:pl-0 lg:pr-4 text-xs text-mist/80 space-y-1.5">
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-clay font-semibold">
                  {state.language === 'es' ? 'Pulso del Estudio' : 'Studio Snapshot'}
                </div>
                <div className="text-porcelain font-medium">
                  2 {state.language === 'es' ? 'Grupos Activos' : 'Active Cohorts'} · 14{' '}
                  {state.language === 'es' ? 'Alumnas' : 'Enrolled Students'}
                </div>
                <div className="text-mist/70">
                  101 {state.language === 'es' ? 'Productos en Inventario' : 'Inventory Items'} · EN / ES
                </div>
              </div>

              {!videoFailed && (
                <button
                  type="button"
                  onClick={toggleVideo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal/60 border border-white/15 text-[11px] text-mist/85 hover:text-white transition-colors w-fit"
                  aria-label={videoPlaying ? 'Pause background video' : 'Play background video'}
                >
                  {videoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>
                    {videoPlaying
                      ? state.language === 'es'
                        ? 'Pausar fondo'
                        : 'Ambient video'
                      : state.language === 'es'
                        ? 'Reproducir'
                        : 'Paused'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ATELIER CREDENTIALS STRIP */}
      <div className="bg-white border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-4 text-[11.5px] text-softgray">
          <span className="font-medium text-charcoal">
            La Voute Beauty Academy LLC · City Terrace, Los Angeles
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>2 {state.language === 'es' ? 'Grupos Activos' : 'Active Cohorts'}</span>
            <span>14 {state.language === 'es' ? 'Alumnas Inscritas' : 'Enrolled Students'}</span>
            <span>101 {state.language === 'es' ? 'Productos de Estudio' : 'Studio Products'}</span>
            <span className="text-olive font-semibold">LVB-00031+ · EN / ES</span>
          </div>
        </div>
      </div>

      {/* SECTION A: ACADEMY OPERATIONS OVERVIEW (Asymmetrical Editorial Split) */}
      <section
        id="overview"
        ref={revOverview.ref}
        className={`py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto transition-all duration-700 ${
          revOverview.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive">
              {state.language === 'es' ? '01 · OPERACIÓN UNIFICADA' : '01 · ONE ORGANIZED WORKSPACE'}
            </div>
            <h2 className="font-editorial text-3xl sm:text-5xl text-charcoal leading-[1.08]">
              {state.language === 'es'
                ? 'Diseñado alrededor del ritmo real de La Voute.'
                : 'Built around how La Voute actually runs.'}
            </h2>
            <p className="text-sm sm:text-base text-softgray leading-relaxed">
              {state.language === 'es'
                ? 'Los prospectos permanecen en HubSpot. En el momento en que una alumna se inscribe, LVB Pulse coordina sus clases, cuotas semanales, entregas de efectivo, visitas al estudio y suministros sin hojas dispersas.'
                : 'Unconverted leads stay in HubSpot. The moment a student enrolls, LVB Pulse unifies their classes, dynamic weekly tuition, cash envelopes, studio tours, and 101 supply items in one calm system.'}
            </p>

            <div className="divide-y divide-hairline border-y border-hairline">
              {[
                {
                  label: state.language === 'es' ? 'Trazabilidad Completa' : 'Complete Traceability',
                  detail:
                    state.language === 'es'
                      ? 'Cada recibo secuencial LVB-000XX se vincula a alumna, clase, cobrador y corte de caja.'
                      : 'Every sequential LVB-000XX receipt connects student, class week, collector, and locked handoff.',
                },
                {
                  label: state.language === 'es' ? 'Hecho para Teléfono en Clase' : 'Phone-First in Studio',
                  detail:
                    state.language === 'es'
                      ? 'Asistencia y cobro en un toque en español e inglés mientras la instructora enseña.'
                      : 'One-tap Spanish and English attendance & collection crafted for instructors on the studio floor.',
                },
                {
                  label: state.language === 'es' ? 'Privacidad por Rol' : 'Role-Scoped Clarity',
                  detail:
                    state.language === 'es'
                      ? 'Propietarios, instructoras, telemercadeo y personal ven exactamente lo que necesitan.'
                      : 'Owners, instructors, telemarketing, and staff each see only their authorized records.',
                },
              ].map((item) => (
                <div key={item.label} className="py-4">
                  <div className="text-sm font-semibold text-charcoal">{item.label}</div>
                  <div className="text-xs text-softgray mt-1 leading-relaxed">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-12 gap-4 items-end">
            <figure className="col-span-7 space-y-2">
              <div className="overflow-hidden rounded-atelier bg-mist">
                <img
                  src="/images/pillar-students.jpg"
                  alt="Nail academy training session"
                  loading="lazy"
                  className="w-full h-[360px] sm:h-[440px] object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                />
              </div>
              <figcaption className="text-[10.5px] uppercase tracking-[0.16em] text-softgray">
                FIG. 01 — {state.language === 'es' ? 'INSTRUCCIÓN EN ESTUDIO' : 'IN-STUDIO INSTRUCTION'}
              </figcaption>
            </figure>
            <div className="col-span-5 space-y-4">
              <figure className="space-y-2">
                <div className="overflow-hidden rounded-atelier bg-mist">
                  <img
                    src="/images/pillar-classes.jpg"
                    alt="Manicure workstation and tools"
                    loading="lazy"
                    className="w-full h-[200px] sm:h-[250px] object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="text-[10.5px] uppercase tracking-[0.16em] text-softgray">
                  FIG. 02 — {state.language === 'es' ? 'ESTACIÓN DE PRÁCTICA' : 'TRAINING WORKSTATION'}
                </figcaption>
              </figure>
              <div className="p-5 rounded-atelier bg-olive text-porcelain">
                <div className="text-[10px] uppercase tracking-[0.18em] text-mist/75">
                  City Terrace · Los Angeles
                </div>
                <div className="font-editorial text-2xl mt-1.5 text-white">
                  {state.language === 'es' ? 'Cero hojas duplicadas' : 'Zero duplicate spreadsheets'}
                </div>
                <p className="text-xs text-mist/80 mt-1.5 leading-relaxed">
                  {state.language === 'es'
                    ? 'Cada pago actualiza saldos, tablero y reportes al instante.'
                    : 'Every entry updates balances, dashboards, and PDFs simultaneously.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: ATTENDANCE & PAYMENTS (Interactive Studio Preview on Mist Band) */}
      <section
        id="features"
        ref={revFeatures.ref}
        className={`py-20 sm:py-28 bg-mist/65 border-y border-hairline px-4 sm:px-6 lg:px-10 transition-all duration-700 ${
          revFeatures.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Interactive Phone-Style Class Log Preview */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="bg-white border border-hairline rounded-2xl shadow-atelier overflow-hidden max-w-lg mx-auto">
              <div className="bg-olive text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.16em] text-mist/80">
                    {state.language === 'es' ? 'Registro de Clase · En Vivo' : 'Live Class Log Preview'}
                  </div>
                  <div className="font-editorial text-xl mt-0.5">
                    Tuesday Nail Foundations · Week 4
                  </div>
                </div>
                <Badge tone="clay">Marisol</Badge>
              </div>

              <div className="divide-y divide-hairline">
                {[
                  { id: 'stu-02', name: 'Valeria Mendoza Cruz', due: 30, note: '$250 standard plan' },
                  { id: 'stu-03', name: 'Camila Sofia Navarro', due: 37.5, note: 'Recalculated after W3 absence' },
                  { id: 'stu-04', name: 'Daniela Isabel Ortiz', due: 25, note: 'Lowered after W2 overpayment' },
                ].map((stu) => {
                  const status = simAttendance[stu.id] ?? 'P';
                  const skipped = status !== 'P';
                  return (
                    <div key={stu.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-charcoal">{stu.name}</div>
                        <div className="text-xs text-softgray mt-0.5">
                          {skipped ? (
                            <span className="text-clay-dark font-medium">
                              {status === 'C'
                                ? state.language === 'es'
                                  ? 'Pago omitido · Sin falta'
                                  : 'Payment skipped · No makeup'
                                : state.language === 'es'
                                  ? 'Pago omitido · Crea clase perdida'
                                  : 'Payment skipped · Opens missed class'}
                            </span>
                          ) : (
                            <span>
                              Due: <strong className="text-charcoal tabular-nums">${stu.due.toFixed(2)}</strong> · {stu.note}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="inline-flex gap-1 bg-porcelain p-1 rounded-lg border border-hairline shrink-0">
                        {(['P', 'A', 'C', 'E'] as const).map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() =>
                              setSimAttendance((prev) => ({ ...prev, [stu.id]: code }))
                            }
                            className={`w-8 h-8 rounded-md text-xs font-semibold transition-colors ${
                              status === code
                                ? code === 'P'
                                  ? 'bg-status-green text-white'
                                  : code === 'A'
                                    ? 'bg-status-red text-white'
                                    : code === 'E'
                                      ? 'bg-status-amber text-white'
                                      : 'bg-charcoal text-white'
                                : 'text-softgray hover:bg-white'
                            }`}
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-3 bg-porcelain border-t border-hairline flex items-center justify-between text-xs">
                <span className="font-mono text-softgray">
                  due_w = (total − deposit − paid) / (weeks − w + 1)
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive">
              {state.language === 'es' ? '02 · ASISTENCIA Y PAGOS' : '02 · ATTENDANCE & DYNAMIC TUITION'}
            </div>
            <h2 className="font-editorial text-3xl sm:text-5xl text-charcoal leading-[1.08]">
              {state.language === 'es'
                ? 'Un toque para asistencia. Cero cálculos manuales.'
                : 'One tap for attendance. Zero manual payment math.'}
            </h2>
            <p className="text-sm sm:text-base text-softgray leading-relaxed">
              {state.language === 'es'
                ? 'Toca los botones P / A / C / E en la vista interactiva. Cuando una alumna paga de más, sus próximas cuotas bajan automáticamente; si falta, se omite el pago de la semana y se abre su registro de reposición.'
                : 'Try tapping P / A / C / E on the live preview. Extra payments automatically lower later weekly dues, skipped weeks redistribute cleanly across remaining sessions, and absences automatically open a makeup record.'}
            </p>

            {/* Interactive $250 Dynamic Tuition Recalculator */}
            <div className="bg-white border border-hairline rounded-atelier p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-olive">
                  {state.language === 'es'
                    ? 'Simulador Dinámico ($250 / 6 Semanas)'
                    : 'Live $250 Dynamic Tuition Simulator'}
                </span>
                <div className="inline-flex rounded-lg bg-porcelain border border-hairline p-0.5 text-[11px]">
                  {(
                    [
                      ['standard', state.language === 'es' ? 'Estándar' : 'Standard'],
                      ['overpay', state.language === 'es' ? 'Pago extra +$20' : 'Overpay +$20'],
                      ['skip', state.language === 'es' ? 'Falta Sem. 2' : 'Skip W2'],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCalcMode(mode)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        calcMode === mode ? 'bg-olive text-white' : 'text-softgray hover:text-charcoal'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {calcSchedule.map((col) => (
                  <div
                    key={col.label}
                    className={`py-2 px-1 rounded-lg border transition-colors ${
                      col.accent
                        ? 'bg-clay-light/70 border-clay/40'
                        : 'bg-porcelain border-hairline'
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-softgray">{col.label}</div>
                    <div className="text-xs font-bold text-charcoal tabular-nums mt-0.5">
                      {col.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <Button variant="secondary" onClick={() => enterAsUser('user-marisol')}>
                {state.language === 'es'
                  ? 'Probar Registro de Clase como Marisol'
                  : 'Open Full Class Log as Marisol'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: STUDENT MANAGEMENT & 4-STEP CHECKLIST */}
      <section
        ref={revStudents.ref}
        className={`py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto transition-all duration-700 ${
          revStudents.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive">
              {state.language === 'es' ? '03 · GESTIÓN DE ALUMNAS' : '03 · ENROLLED STUDENT LIFECYCLE'}
            </div>
            <h2 className="font-editorial text-3xl sm:text-5xl text-charcoal leading-[1.08]">
              {state.language === 'es'
                ? 'Del depósito inicial hasta la inscripción completa.'
                : 'From initial deposit to fully enrolled — nothing skipped.'}
            </h2>
            <p className="text-sm sm:text-base text-softgray leading-relaxed">
              {state.language === 'es'
                ? 'Cada alumna permanece en estado Pendiente hasta completar las 4 verificaciones clave. Los depósitos tomados por el equipo requieren confirmación del propietario antes de contabilizarse.'
                : 'Every enrolled student stays Pending until all four verification milestones are complete. Deposits collected by instructors or telemarketing stay pending until confirmed by Rudy or Sidney.'}
            </p>
            <Button variant="secondary" onClick={() => enterAsUser('user-jessica')}>
              {state.language === 'es'
                ? 'Explorar Alumnas como Jessica'
                : 'Explore Student CRM as Jessica'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-hairline rounded-atelier p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-hairline">
                <div>
                  <div className="text-xs text-softgray">
                    {state.language === 'es' ? 'Progresión Interactiva' : 'Interactive Enrollment Progression'}
                  </div>
                  <div className="font-editorial text-2xl text-charcoal mt-0.5">
                    Catherine Alejandra Pereira Hastomir
                  </div>
                </div>
                <Badge tone={allSimChecksDone ? 'green' : 'amber'}>
                  {allSimChecksDone ? t('status_enrolled') : t('status_pending')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                {[
                  t('check_depositConfirmed'),
                  t('check_webSubscriptionConfirmed'),
                  t('check_welcomeEmailSent'),
                  t('check_attendanceConfirmedBySidney'),
                ].map((label, idx) => {
                  const done = simChecks[idx];
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setSimChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)))
                      }
                      className={`p-4 rounded-atelier border text-left flex items-start gap-3 transition-colors ${
                        done
                          ? 'bg-status-greenBg/60 border-status-green/30'
                          : 'bg-porcelain border-hairline hover:border-olive'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-status-green shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-softgray shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-softgray">
                          Step 0{idx + 1}
                        </div>
                        <div className="text-xs font-semibold text-charcoal mt-0.5">
                          {label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11.5px] text-softgray mt-4">
                {state.language === 'es'
                  ? 'Haz clic en el paso 4 para ver la transición automática a Inscrita Completa.'
                  : 'Click step 4 above to preview the automatic transition to Fully Enrolled.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION D: FINANCIAL VISIBILITY (Soft Charcoal Editorial Band) */}
      <section
        ref={revFinance.ref}
        className={`py-20 sm:py-28 bg-charcoal text-porcelain px-4 sm:px-6 lg:px-10 transition-all duration-700 ${
          revFinance.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end mb-12">
            <div className="lg:col-span-7 space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-clay">
                {state.language === 'es' ? '04 · VISIBILIDAD FINANCIERA' : '04 · OWNER FINANCIAL VISIBILITY'}
              </div>
              <h2 className="font-editorial text-3xl sm:text-5xl text-white leading-[1.08]">
                {state.language === 'es'
                  ? 'Claridad absoluta desde la mesa hasta la contabilidad.'
                  : 'Clear visibility from every station to the ledger.'}
              </h2>
            </div>
            <p className="lg:col-span-5 text-sm text-mist/80 leading-relaxed">
              {state.language === 'es'
                ? 'Rudy y Sidney revisan entregas de efectivo, aprueban depósitos pendientes, monitorean atrasos y exportan reportes PDF y CSV desde un único libro compartido.'
                : 'Rudy and Sidney verify cash handoffs, approve pending deposits, track behind-schedule balances, and export branded PDF/CSV reports from one reconciled ledger.'}
            </p>
          </div>

          {/* Hairline-divided Architectural Financial Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-white/15 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
            <div className="py-7 sm:px-6 first:sm:pl-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-mist/70">
                {state.language === 'es' ? 'Cobranza Confirmada (Demo)' : 'Confirmed Ledger (Demo)'}
              </div>
              <div className="font-editorial text-4xl text-white mt-2 tabular-nums">
                {formatCurrency(confirmedTotal, state.language)}
              </div>
              <div className="text-xs text-mist/70 mt-1.5">
                {state.payments.length} sequential LVB receipts
              </div>
            </div>
            <div className="py-7 sm:px-6">
              <div className="text-[11px] uppercase tracking-[0.16em] text-mist/70">
                {t('kpiOutstandingBalances')}
              </div>
              <div className="font-editorial text-4xl text-white mt-2 tabular-nums">
                {formatCurrency(outstandingTotal, state.language)}
              </div>
              <div className="text-xs text-mist/70 mt-1.5">
                Derived live across 14 students
              </div>
            </div>
            <div className="py-7 sm:px-6">
              <div className="text-[11px] uppercase tracking-[0.16em] text-mist/70">
                {state.language === 'es' ? 'Cortes Confirmados' : 'Locked Cash Handoffs'}
              </div>
              <div className="font-editorial text-4xl text-white mt-2 tabular-nums flex items-center gap-2">
                <span>{lockedHandoffs}</span>
                <Lock className="w-5 h-5 text-clay" />
              </div>
              <div className="text-xs text-mist/70 mt-1.5">
                Draft → Submitted → Confirmed → Locked
              </div>
            </div>
            <div className="py-7 sm:px-6 last:sm:pr-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-mist/70">
                {state.language === 'es' ? 'Secuencia de Recibos' : 'Receipt Sequence'}
              </div>
              <div className="font-editorial text-4xl text-clay mt-2 font-mono">
                LVB-00031+
              </div>
              <div className="text-xs text-mist/70 mt-1.5">
                Continuous with paper contracts
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button variant="clay" onClick={() => enterAsUser('user-rudy')}>
              {state.language === 'es'
                ? 'Abrir Contabilidad como Rudy'
                : 'Inspect Owner Dashboard as Rudy'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION E: ACADEMY OPERATIONS (Editorial Index Strip) */}
      <section
        id="operations"
        className="py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto"
      >
        <div className="max-w-2xl mb-12">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive mb-2">
            {state.language === 'es' ? '05 · OPERACIONES DEL ESTUDIO' : '05 · COMPLETE STUDIO OPERATIONS'}
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl text-charcoal leading-[1.08]">
            {state.language === 'es'
              ? 'Más allá de los pagos: todo lo que sostiene al estudio.'
              : 'Beyond tuition: every operational detail under one roof.'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-hairline">
          {[
            {
              icon: MapPin,
              title: t('nav_tours'),
              stat: `${state.tours.length} tours`,
              desc:
                state.language === 'es'
                  ? 'Calendario y lista de visitas, asistencia y tasa de conversión.'
                  : 'Calendar and list scheduling, show rate, and enrollment conversion.',
            },
            {
              icon: Package,
              title: t('nav_inventory'),
              stat: `101 items · ${orderNowCount} Order Now`,
              desc:
                state.language === 'es'
                  ? '5 secciones, alertas China y Legacy Nails, valuación solo para propietarios.'
                  : '5 sections, China & Legacy Nails lead-time warnings, owner-only costs.',
            },
            {
              icon: MessageSquareWarning,
              title: t('nav_weeklyReports'),
              stat: `${state.reports.length} reports`,
              desc:
                state.language === 'es'
                  ? 'Asistencia inmediata, suministros y quejas con privacidad para el personal.'
                  : 'Immediate assistance, supplies, and complaints with private staff visibility.',
            },
            {
              icon: CalendarDays,
              title: `${t('nav_tasks')} & ${t('nav_calendar')}`,
              stat: `${state.tasks.length} tasks · ${state.projects.length} projects`,
              desc:
                state.language === 'es'
                  ? 'Tareas asignadas, proyectos estratégicos y reuniones privadas por invitación.'
                  : 'Assigned tasks, Owner-only strategic projects, and invitation-based meetings.',
            },
          ].map((op) => {
            const Icon = op.icon;
            return (
              <div
                key={op.title}
                className="py-7 md:pr-8 border-b border-hairline flex flex-col justify-between gap-4"
              >
                <div>
                  <Icon className="w-5 h-5 text-olive mb-4" />
                  <h3 className="font-editorial text-2xl text-charcoal">{op.title}</h3>
                  <p className="text-xs text-softgray mt-2 leading-relaxed">{op.desc}</p>
                </div>
                <div className="text-xs font-semibold text-clay-dark">{op.stat}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION F: DESIGNED FOR THE ENTIRE TEAM (4 Role Tracks) */}
      <section
        id="team"
        className="py-20 sm:py-28 bg-mist/60 border-t border-hairline px-4 sm:px-6 lg:px-10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div className="max-w-xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive mb-2">
                {state.language === 'es' ? '06 · PARA TODO EL EQUIPO' : '06 · DESIGNED FOR THE ENTIRE TEAM'}
              </div>
              <h2 className="font-editorial text-3xl sm:text-5xl text-charcoal leading-[1.08]">
                {state.language === 'es'
                  ? 'Cuatro roles. Cuatro espacios enfocados.'
                  : 'Four roles. Four focused workspaces.'}
              </h2>
            </div>
            <p className="text-xs text-softgray max-w-sm">
              {state.language === 'es'
                ? 'Haz clic en cualquier rol para ingresar directamente a su entorno en vivo.'
                : 'Select any role below to jump straight into its live permissioned workspace.'}
            </p>
          </div>

          <div className="bg-white border border-hairline rounded-atelier divide-y lg:divide-y-0 lg:divide-x divide-hairline grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
            {[
              {
                role: t('role_owner'),
                people: 'Rudy Figueroa · Sidney Figueroa',
                userId: 'user-rudy',
                summary:
                  state.language === 'es'
                    ? 'Panel financiero, contabilidad, confirmación de efectivo y depósitos, costos de inventario y proyectos.'
                    : 'Full financial command center, cash locking, deposit confirmation, inventory costs, and strategic projects.',
              },
              {
                role: t('role_instructor'),
                people: 'Marisol · Julietha Delgado',
                userId: 'user-marisol',
                summary:
                  state.language === 'es'
                    ? 'Solo clases asignadas, asistencia en teléfono, cobros propios, cortes de caja y reposiciones.'
                    : 'Assigned classes only, mobile attendance, own collections, daily cash handoffs, and makeup scheduling.',
              },
              {
                role: t('role_telemarketing'),
                people: 'Jessica',
                userId: 'user-jessica',
                summary:
                  state.language === 'es'
                    ? 'Inscripciones, seguimiento de visitas al estudio, toma de depósitos y saldos controlados por política.'
                    : 'Student onboarding, studio tour booking, deposit intake, and policy-governed balance visibility.',
              },
              {
                role: t('role_staff'),
                people: 'Lizy Amador',
                userId: 'user-lizy',
                summary:
                  state.language === 'es'
                    ? 'Visitas al estudio, información básica de alumnas, conteo de inventario y reportes semanales.'
                    : 'Front-desk studio tours, basic student info, counts-only inventory, tasks, and private reports.',
              },
            ].map((track) => (
              <button
                key={track.userId}
                type="button"
                onClick={() => enterAsUser(track.userId)}
                className="p-6 sm:p-7 text-left hover:bg-porcelain/70 transition-colors flex flex-col justify-between gap-6 group"
              >
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-dark">
                    {track.role}
                  </div>
                  <h3 className="font-editorial text-2xl text-charcoal mt-1.5">
                    {track.people.split(' · ')[0]}
                  </h3>
                  <div className="text-xs text-softgray mt-0.5">{track.people}</div>
                  <p className="text-xs text-charcoal/80 mt-4 leading-relaxed">
                    {track.summary}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-olive group-hover:translate-x-0.5 transition-transform">
                  {state.language === 'es' ? 'Entrar al espacio' : 'Preview workspace'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION G: FINAL CTA (Deep Olive Atelier Band) */}
      <section className="py-20 sm:py-24 bg-olive text-porcelain px-4 sm:px-6 lg:px-10">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist/80">
            LA VOUTE BEAUTY ACADEMY LLC
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl text-white leading-[1.08]">
            {state.language === 'es'
              ? 'Una operación tan cuidada como el trabajo que enseñas.'
              : 'An academy workspace as considered as the craft you teach.'}
          </h2>
          <p className="text-sm sm:text-base text-mist/85 max-w-xl mx-auto leading-relaxed">
            {state.language === 'es'
              ? 'Explora los cuatro roles, prueba el registro de asistencia, confirma entregas de efectivo y genera recibos PDF en tiempo real.'
              : 'Explore all four team roles, test live attendance and payment recalculation, lock cash handoffs, and export branded PDFs.'}
          </p>
          <div className="pt-3">
            <Button
              size="lg"
              variant="clay"
              onClick={() => navigate('/app')}
              className="h-12 px-8 text-sm"
            >
              {t('landingPrimaryCta')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* MINIMAL FOOTER */}
      <footer className="bg-charcoal text-mist/75 py-12 px-4 sm:px-6 lg:px-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-2.5">
              <LVBMonogram size="sm" tone="porcelain" />
              <div>
                <div className="font-editorial text-lg text-white leading-none">LVB Pulse</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-mist/60 mt-0.5">
                  La Voute Beauty Academy LLC
                </div>
              </div>
            </div>
            <p className="text-xs text-mist/65 leading-relaxed">{t('footerDisclaimer')}</p>
          </div>

          <div className="flex flex-wrap gap-10 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[10.5px]">
                {state.language === 'es' ? 'Plataforma' : 'Platform'}
              </div>
              <a href="#overview" className="block hover:text-white">
                {state.language === 'es' ? 'Visión General' : 'Overview'}
              </a>
              <a href="#features" className="block hover:text-white">
                {state.language === 'es' ? 'Asistencia y Pagos' : 'Attendance & Payments'}
              </a>
              <a href="#operations" className="block hover:text-white">
                {state.language === 'es' ? 'Operaciones' : 'Operations'}
              </a>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[10.5px]">
                {state.language === 'es' ? 'Demostración' : 'Live Demo'}
              </div>
              <button type="button" onClick={() => navigate('/app')} className="block hover:text-white text-left">
                {t('landingPrimaryCta')}
              </button>
              <button type="button" onClick={() => enterAsUser('user-rudy')} className="block hover:text-white text-left">
                Rudy Figueroa ({t('role_owner')})
              </button>
              <button type="button" onClick={() => enterAsUser('user-marisol')} className="block hover:text-white text-left">
                Marisol ({t('role_instructor')})
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-mist/50">
          <span>© 2026 La Voute Beauty Academy LLC · LVB Pulse Showcase</span>
          <span>City Terrace, Los Angeles, California</span>
        </div>
      </footer>
    </div>
  );
};
