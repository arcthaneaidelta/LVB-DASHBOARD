import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Calendar,
  Package,
  ClipboardList,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  formatCurrency,
  formatCurrencyExact,
  getStudentFinancialSummary,
  roundCurrency,
} from '../../calculations/paymentEngine';
import {
  Badge,
  Button,
  Card,
  KpiCard,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { Deposit, PaymentMethod } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

type PeriodOption = 'this_week' | 'last_week' | 'this_month' | 'custom';
type BreakdownMode = 'method' | 'collector' | 'class';

const TODAY = '2026-11-24';

function getPeriodRange(
  period: PeriodOption,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  if (period === 'this_week') return { start: '2026-11-22', end: '2026-11-28' };
  if (period === 'last_week') return { start: '2026-11-15', end: '2026-11-21' };
  if (period === 'this_month') return { start: '2026-11-01', end: '2026-11-30' };
  return { start: customStart || '2026-10-01', end: customEnd || TODAY };
}

export const DashboardPage: React.FC = () => {
  const { state, currentUser, confirmDeposit, t } = useApp();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodOption>('this_month');
  const [customStart, setCustomStart] = useState('2026-10-05');
  const [customEnd, setCustomEnd] = useState(TODAY);
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>('method');
  const [reviewDeposit, setReviewDeposit] = useState<Deposit | null>(null);

  const range = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const confirmedPayments = useMemo(
    () => state.payments.filter((p) => p.status === 'confirmed'),
    [state.payments]
  );

  const periodPayments = useMemo(
    () =>
      confirmedPayments.filter(
        (p) => p.date >= range.start && p.date <= range.end
      ),
    [confirmedPayments, range]
  );

  // KPI metrics (strictly derived from shared state)
  const kpis = useMemo(() => {
    const thisWeekTotal = confirmedPayments
      .filter((p) => p.date >= '2026-11-18' && p.date <= '2026-11-24')
      .reduce((s, p) => s + p.amount, 0);

    const thisMonthTotal = confirmedPayments
      .filter((p) => p.date >= '2026-11-01' && p.date <= '2026-11-30')
      .reduce((s, p) => s + p.amount, 0);

    const selectedPeriodTotal = periodPayments.reduce((s, p) => s + p.amount, 0);

    const activeStudents = state.students.filter(
      (s) => s.enrollmentStatus === 'enrolled' || s.enrollmentStatus === 'pending'
    );

    const outstandingBalances = activeStudents.reduce((sum, stu) => {
      const cls = state.classes.find((c) => c.id === stu.classId);
      const fin = getStudentFinancialSummary(stu, cls, state.payments, state.deposits);
      return sum + fin.remainingBalance;
    }, 0);

    const pendingDeposits = state.deposits.filter((d) => d.status === 'pending');
    const pendingDepositsTotal = pendingDeposits.reduce((s, d) => s + d.amount, 0);
    const pendingEnrollments = state.students.filter(
      (s) => s.enrollmentStatus === 'pending'
    ).length;

    return {
      thisWeekTotal: roundCurrency(thisWeekTotal),
      thisMonthTotal: roundCurrency(thisMonthTotal),
      selectedPeriodTotal: roundCurrency(selectedPeriodTotal),
      outstandingBalances: roundCurrency(outstandingBalances),
      activeStudentsCount: activeStudents.length,
      pendingDepositsCount: pendingDeposits.length,
      pendingDepositsTotal: roundCurrency(pendingDepositsTotal),
      pendingEnrollments,
    };
  }, [confirmedPayments, periodPayments, state.students, state.classes, state.payments, state.deposits]);

  // 8-Week Collections Trend (derived from real payment dates)
  const eightWeekTrend = useMemo(() => {
    const weeks = [
      { label: 'Oct 5', start: '2026-10-05', end: '2026-10-11' },
      { label: 'Oct 12', start: '2026-10-12', end: '2026-10-18' },
      { label: 'Oct 19', start: '2026-10-19', end: '2026-10-25' },
      { label: 'Oct 26', start: '2026-10-26', end: '2026-11-01' },
      { label: 'Nov 2', start: '2026-11-02', end: '2026-11-08' },
      { label: 'Nov 9', start: '2026-11-09', end: '2026-11-15' },
      { label: 'Nov 16', start: '2026-11-16', end: '2026-11-22' },
      { label: 'Nov 23', start: '2026-11-23', end: '2026-11-29' },
    ];

    return weeks.map((w) => {
      const inWeek = confirmedPayments.filter(
        (p) => p.date >= w.start && p.date <= w.end
      );
      const deposits = roundCurrency(
        inWeek.filter((p) => p.category === 'deposit').reduce((s, p) => s + p.amount, 0)
      );
      const tuition = roundCurrency(
        inWeek.filter((p) => p.category !== 'deposit').reduce((s, p) => s + p.amount, 0)
      );
      return {
        label: w.label,
        tuition,
        deposits,
        total: roundCurrency(tuition + deposits),
        inSelectedRange: w.end >= range.start && w.start <= range.end,
      };
    });
  }, [confirmedPayments, range]);

  // Collections Breakdown (reactive to selected period & breakdown tab)
  const breakdownData = useMemo(() => {
    const map = new Map<string, { key: string; label: string; amount: number; count: number }>();

    periodPayments.forEach((p) => {
      let key = '';
      let label = '';
      if (breakdownMode === 'method') {
        key = p.method;
        label = t(`method_${p.method as PaymentMethod}` as TranslationKey);
      } else if (breakdownMode === 'collector') {
        key = p.collectorId;
        label = p.collectorName;
      } else {
        key = p.classId;
        label = state.classes.find((c) => c.id === p.classId)?.name ?? p.classId;
      }
      const existing = map.get(key) ?? { key, label, amount: 0, count: 0 };
      existing.amount = roundCurrency(existing.amount + p.amount);
      existing.count += 1;
      map.set(key, existing);
    });

    const list = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    const maxVal = Math.max(1, ...list.map((i) => i.amount));
    return list.map((item) => ({
      ...item,
      pct: Math.round((item.amount / maxVal) * 100),
    }));
  }, [periodPayments, breakdownMode, state.classes, t]);

  // Operational Alerts (all 8 categories from PRD Section 8.5)
  const alerts = useMemo(() => {
    const pendingDeposits = state.deposits.filter((d) => d.status === 'pending');
    const urgentReports = state.reports.filter(
      (r) => r.status !== 'resolved' && (r.urgency === 'urgent' || r.urgency === 'high')
    );
    const pendingEnrollments = state.students.filter(
      (s) => s.enrollmentStatus === 'pending'
    );
    const openMissed = state.missedClasses.filter((m) => m.makeupStatus !== 'cleared');
    const pastUnloggedTours = state.tours.filter(
      (tr) => tr.date < TODAY && tr.outcome === 'pending'
    );
    const lowStock = state.inventory.filter((i) => i.quantity <= 5);
    const overdueTasks = state.tasks.filter(
      (tk) => tk.status !== 'completed' && tk.dueDate < TODAY
    );
    const unloggedClassWeeks = state.classes.filter(
      (c) =>
        c.status === 'active' &&
        !state.classLogSubmissions.some(
          (sub) => sub.classId === c.id && sub.week === c.currentWeek
        )
    );

    return {
      pendingDeposits,
      urgentReports,
      pendingEnrollments,
      openMissed,
      pastUnloggedTours,
      lowStock,
      overdueTasks,
      unloggedClassWeeks,
    };
  }, [state]);

  const handleBreakdownClick = (key: string) => {
    const param =
      breakdownMode === 'method'
        ? `method=${key}`
        : breakdownMode === 'collector'
          ? `collector=${key}`
          : `classId=${key}`;
    navigate(`/app/accounting?${param}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Period Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-champagne">
            {state.language === 'es' ? 'MARTES, 24 DE NOVIEMBRE DE 2026' : 'TUESDAY, NOVEMBER 24, 2026'}
          </p>
          <h1 className="font-editorial text-[28px] sm:text-[34px] text-navy leading-tight mt-1">
            {t('goodMorning')}, {currentUser?.firstName ?? 'Rudy'}.
          </h1>
          <p className="text-sm text-slatewarm mt-1">{t('dashboardSub')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white border border-borderwarm rounded-lg p-1 gap-0.5 flex-wrap">
            {(
              [
                ['this_week', 'periodThisWeek'],
                ['last_week', 'periodLastWeek'],
                ['this_month', 'periodThisMonth'],
                ['custom', 'periodCustom'],
              ] as [PeriodOption, TranslationKey][]
            ).map(([val, key]) => (
              <button
                key={val}
                type="button"
                onClick={() => setPeriod(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === val
                    ? 'bg-navy text-white'
                    : 'text-slatewarm hover:text-navy hover:bg-porcelain'
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white border border-borderwarm rounded-lg px-2.5 py-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs text-navy bg-transparent focus:outline-none"
                aria-label="Start date"
              />
              <span className="text-xs text-slatewarm">–</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs text-navy bg-transparent focus:outline-none"
                aria-label="End date"
              />
            </div>
          )}

          <Button size="sm" onClick={() => navigate('/app/payments')}>
            <Plus className="w-3.5 h-3.5" />
            {state.language === 'es' ? 'Registrar Pago' : 'Record Payment'}
          </Button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard
          label={
            period === 'this_week'
              ? t('kpiCollectedWeek')
              : `${t('kpiCollectedWeek')} (7d)`
          }
          value={formatCurrency(kpis.thisWeekTotal, state.language)}
          subtext={
            state.language === 'es'
              ? `Periodo seleccionado (${range.start} a ${range.end}): ${formatCurrency(kpis.selectedPeriodTotal, state.language)}`
              : `Selected period (${range.start} – ${range.end}): ${formatCurrency(kpis.selectedPeriodTotal, state.language)}`
          }
          tone="sage"
          icon={<DollarSign className="w-4 h-4" />}
          onClick={() => navigate('/app/accounting')}
        />
        <KpiCard
          label={t('kpiCollectedMonth')}
          value={formatCurrency(kpis.thisMonthTotal, state.language)}
          subtext={
            state.language === 'es'
              ? `${confirmedPayments.filter((p) => p.date >= '2026-11-01').length} pagos confirmados en noviembre`
              : `${confirmedPayments.filter((p) => p.date >= '2026-11-01').length} confirmed transactions in November`
          }
          tone="default"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={() => navigate('/app/accounting')}
        />
        <KpiCard
          label={t('kpiOutstandingBalances')}
          value={formatCurrency(kpis.outstandingBalances, state.language)}
          subtext={
            state.language === 'es'
              ? 'Saldo restante combinado de alumnas activas'
              : 'Combined remaining tuition across active students'
          }
          tone="amber"
          icon={<ClipboardList className="w-4 h-4" />}
          onClick={() => navigate('/app/accounting')}
        />
        <KpiCard
          label={t('kpiActiveStudents')}
          value={kpis.activeStudentsCount}
          subtext={
            state.language === 'es'
              ? `En ${state.classes.filter((c) => c.status === 'active').length} grupos activos`
              : `Across ${state.classes.filter((c) => c.status === 'active').length} active nail cohorts`
          }
          tone="default"
          icon={<Users className="w-4 h-4" />}
          onClick={() => navigate('/app/students')}
        />
        <KpiCard
          label={t('kpiPendingDeposits')}
          value={`${kpis.pendingDepositsCount} · ${formatCurrency(kpis.pendingDepositsTotal, state.language)}`}
          subtext={
            state.language === 'es'
              ? 'Esperando confirmación del propietario'
              : 'Awaiting owner confirmation to post to ledger'
          }
          tone={kpis.pendingDepositsCount > 0 ? 'terracotta' : 'sage'}
          icon={<Clock className="w-4 h-4" />}
          onClick={() => navigate('/app/payments')}
        />
        <KpiCard
          label={t('kpiPendingEnrollments')}
          value={kpis.pendingEnrollments}
          subtext={
            state.language === 'es'
              ? 'Lista de verificación de 4 pasos incompleta'
              : 'Students with incomplete 4-step enrollment checklists'
          }
          tone={kpis.pendingEnrollments > 0 ? 'amber' : 'sage'}
          icon={<CheckCircle2 className="w-4 h-4" />}
          onClick={() => navigate('/app/students')}
        />
      </div>

      {/* Charts Row: 8-Week Trend + Interactive Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="xl:col-span-7 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-navy">
                {t('collectionsTrendTitle')}
              </h2>
              <p className="text-xs text-slatewarm">
                {state.language === 'es'
                  ? 'Pagos semanales vs. depósitos confirmados (derivados del libro real)'
                  : 'Weekly tuition vs. confirmed deposits derived live from payment records'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slatewarm">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-navy" />
                {state.language === 'es' ? 'Colegiaturas' : 'Weekly Tuition'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-champagne" />
                {t('deposit')}
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eightWeekTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E3DA" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#727782', fontSize: 11 }}
                  axisLine={{ stroke: '#E7E3DA' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#727782', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  cursor={{ fill: '#F1EEE5' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E7E3DA',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#17243B',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrencyExact(value, state.language),
                    name === 'tuition'
                      ? state.language === 'es'
                        ? 'Colegiaturas'
                        : 'Weekly Tuition'
                      : t('deposit'),
                  ]}
                />
                <Bar
                  dataKey="tuition"
                  stackId="a"
                  fill="#17243B"
                  radius={[0, 0, 0, 0]}
                  animationDuration={500}
                />
                <Bar
                  dataKey="deposits"
                  stackId="a"
                  fill="#B99A60"
                  radius={[4, 4, 0, 0]}
                  animationDuration={500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-5 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-navy">
                {t('collectionsBreakdownTitle')}
              </h2>
              <p className="text-xs text-slatewarm">
                {state.language === 'es'
                  ? 'Haz clic en una barra para filtrar en Contabilidad'
                  : 'Click any row to open filtered Accounting view'}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-borderwarm bg-porcelain p-0.5">
              {(
                [
                  ['method', state.language === 'es' ? 'Método' : 'Type'],
                  ['collector', state.language === 'es' ? 'Cobrador' : 'Collector'],
                  ['class', state.language === 'es' ? 'Clase' : 'Class'],
                ] as [BreakdownMode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBreakdownMode(m)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    breakdownMode === m
                      ? 'bg-navy text-white'
                      : 'text-slatewarm hover:text-navy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {breakdownData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slatewarm py-10">
              {t('noResults')}
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {breakdownData.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => handleBreakdownClick(row.key)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-navy group-hover:text-champagne transition-colors truncate pr-2">
                      {row.label}
                    </span>
                    <span className="tabular-nums font-semibold text-navy shrink-0">
                      {formatCurrencyExact(row.amount, state.language)}{' '}
                      <span className="text-slatewarm font-normal">({row.count})</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-ivory rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy group-hover:bg-champagne rounded-full transition-all duration-300"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-borderwarm flex items-center justify-between text-xs">
            <span className="text-slatewarm">
              {state.language === 'es' ? 'Total del periodo' : 'Period Total'}
            </span>
            <span className="font-semibold text-navy tabular-nums">
              {formatCurrencyExact(kpis.selectedPeriodTotal, state.language)}
            </span>
          </div>
        </Card>
      </div>

      {/* Operational Alerts + Active Class Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Alerts Center */}
        <Card className="xl:col-span-7 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-champagne" />
              <h2 className="text-base font-semibold text-navy">{t('alertsTitle')}</h2>
            </div>
            <Badge tone="amber">
              {alerts.pendingDeposits.length +
                alerts.urgentReports.length +
                alerts.pastUnloggedTours.length +
                alerts.overdueTasks.length +
                alerts.unloggedClassWeeks.length}{' '}
              {state.language === 'es' ? 'activas' : 'actionable'}
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Pending Deposits — Inline Confirm Action (PRD Section 8.5 exact example!) */}
            {alerts.pendingDeposits.map((dep) => {
              const student = state.students.find((s) => s.id === dep.studentId);
              return (
                <div
                  key={dep.id}
                  className="p-3.5 rounded-xl bg-amberwarm-light/55 border border-amberwarm/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="amber">
                        {state.language === 'es'
                          ? 'Depósito por confirmar'
                          : 'Deposit awaiting confirmation'}
                      </Badge>
                      <span className="text-xs font-mono text-slatewarm">
                        {dep.receiptNumber}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-navy mt-1">
                      {student?.fullName ?? dep.studentId} —{' '}
                      <span className="tabular-nums">
                        {formatCurrency(dep.amount, state.language)}
                      </span>
                    </p>
                    <p className="text-xs text-slatewarm mt-0.5">
                      {t('collector')}: {dep.collectorName} · {t(`method_${dep.method}` as TranslationKey)} · {dep.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/app/students?studentId=${dep.studentId}`)}
                    >
                      {state.language === 'es' ? 'Ver alumna' : 'View student'}
                    </Button>
                    <Button size="sm" onClick={() => setReviewDeposit(dep)}>
                      {state.language === 'es' ? 'Revisar y confirmar' : 'Review & Confirm'}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Urgent Reports */}
            {alerts.urgentReports.map((rep) => (
              <div
                key={rep.id}
                className="p-3.5 rounded-xl bg-terracotta-light/60 border border-terracotta/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Badge tone="terracotta">
                    {state.language === 'es' ? 'Reporte urgente' : 'Urgent report'}
                  </Badge>
                  <p className="text-sm font-semibold text-navy mt-1">{rep.subject}</p>
                  <p className="text-xs text-slatewarm mt-0.5">
                    {rep.submittedByName} · {rep.date}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate('/app/weekly-reports')}
                >
                  {t('viewDetails')}
                </Button>
              </div>
            ))}

            {/* Compact operational summary flags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {alerts.unloggedClassWeeks.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/app/class-log')}
                  className="p-3 rounded-xl border border-borderwarm bg-porcelain/70 hover:border-champagne text-left transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-navy">
                      {state.language === 'es' ? 'Semanas sin registrar' : 'Class weeks not logged'}
                    </div>
                    <div className="text-xs text-slatewarm mt-0.5">
                      {alerts.unloggedClassWeeks
                        .map((c) => `${c.name} (W${c.currentWeek})`)
                        .join(', ')}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-champagne shrink-0" />
                </button>
              )}

              {alerts.lowStock.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/app/inventory')}
                  className="p-3 rounded-xl border border-borderwarm bg-porcelain/70 hover:border-champagne text-left transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-navy flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-terracotta" />
                      {state.language === 'es' ? 'Inventario bajo (Pedir ahora)' : 'Low inventory (Order Now)'}
                    </div>
                    <div className="text-xs text-slatewarm mt-0.5">
                      {alerts.lowStock.length}{' '}
                      {state.language === 'es' ? 'productos con ≤ 5 unidades' : 'products at ≤ 5 units'}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-champagne shrink-0" />
                </button>
              )}

              {alerts.pastUnloggedTours.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/app/studio-tours')}
                  className="p-3 rounded-xl border border-borderwarm bg-porcelain/70 hover:border-champagne text-left transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-navy">
                      {state.language === 'es' ? 'Visitas pasadas sin resultado' : 'Past tours without outcome'}
                    </div>
                    <div className="text-xs text-slatewarm mt-0.5">
                      {alerts.pastUnloggedTours.map((tr) => tr.visitorName).join(', ')}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-champagne shrink-0" />
                </button>
              )}

              {alerts.overdueTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/app/tasks')}
                  className="p-3 rounded-xl border border-borderwarm bg-porcelain/70 hover:border-champagne text-left transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-navy">
                      {state.language === 'es' ? 'Tareas vencidas' : 'Overdue tasks'}
                    </div>
                    <div className="text-xs text-slatewarm mt-0.5">
                      {alerts.overdueTasks.length}{' '}
                      {state.language === 'es' ? 'requieren seguimiento' : 'require follow-up'}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-champagne shrink-0" />
                </button>
              )}

              {alerts.openMissed.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/app/missed-classes')}
                  className="p-3 rounded-xl border border-borderwarm bg-porcelain/70 hover:border-champagne text-left transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-navy">
                      {state.language === 'es' ? 'Clases perdidas abiertas' : 'Open missed classes'}
                    </div>
                    <div className="text-xs text-slatewarm mt-0.5">
                      {alerts.openMissed.length}{' '}
                      {state.language === 'es' ? 'pendientes de reposición / cierre' : 'awaiting makeup or owner clearance'}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-champagne shrink-0" />
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Active Class Overview */}
        <Card className="xl:col-span-5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-navy">
              {t('classOverviewTitle')}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/classes')}>
              {state.language === 'es' ? 'Ver clases' : 'Manage'}
            </Button>
          </div>
          <div className="space-y-3.5">
            {state.classes.map((cls) => {
              const roster = state.students.filter((s) => s.classId === cls.id);
              const instructors = state.users
                .filter((u) => cls.instructorIds.includes(u.id))
                .map((u) => u.name)
                .join(', ');
              const expectedTotal = roster.reduce((s, st) => s + st.courseTotal, 0);
              const collectedTotal = roster.reduce((s, st) => {
                const fin = getStudentFinancialSummary(st, cls, state.payments, state.deposits);
                return s + fin.totalPaid;
              }, 0);
              const pct = expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;
              const loggedCurrentWeek = state.classLogSubmissions.some(
                (sub) => sub.classId === cls.id && sub.week === cls.currentWeek
              );

              return (
                <div
                  key={cls.id}
                  onClick={() => navigate(`/app/classes?classId=${cls.id}`)}
                  className="p-4 rounded-xl border border-borderwarm bg-porcelain/50 hover:bg-porcelain hover:border-champagne/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-navy">{cls.name}</div>
                      <div className="text-xs text-slatewarm mt-0.5">
                        {cls.program} · {cls.weekday} · {instructors}
                      </div>
                    </div>
                    <Badge tone={loggedCurrentWeek ? 'sage' : 'amber'}>
                      W{cls.currentWeek}/{cls.weeks}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slatewarm">
                        {state.language === 'es' ? 'Alumnas:' : 'Enrolled:'}{' '}
                      </span>
                      <span className="font-semibold text-navy">{roster.length}</span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-semibold text-navy">
                        {formatCurrency(collectedTotal, state.language)}
                      </span>
                      <span className="text-slatewarm">
                        {' '}
                        / {formatCurrency(expectedTotal, state.language)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-ivory rounded-full overflow-hidden">
                    <div
                      className="h-full bg-champagne rounded-full"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent Activity Timeline */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-champagne" />
            <h2 className="text-base font-semibold text-navy">
              {t('recentActivityTitle')}
            </h2>
          </div>
          <span className="text-xs text-slatewarm">
            {state.language === 'es' ? 'Actualizado en tiempo real' : 'Live shared ledger'}
          </span>
        </div>

        <div className="divide-y divide-borderwarm">
          {state.activities.slice(0, 8).map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => navigate(act.targetRoute)}
              className="w-full py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-left hover:bg-porcelain/70 px-2 -mx-2 rounded-lg transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-navy">{act.title}</div>
                <div className="text-xs text-slatewarm truncate">{act.detail}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-slatewarm">
                <span>{act.actorName}</span>
                <span>·</span>
                <span className="tabular-nums">{act.timestamp.slice(0, 10)}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Deposit Confirmation Modal */}
      <Modal
        open={Boolean(reviewDeposit)}
        onClose={() => setReviewDeposit(null)}
        title={
          state.language === 'es'
            ? 'Confirmar Depósito de Alumna'
            : 'Confirm Student Deposit'
        }
        subtitle={
          state.language === 'es'
            ? 'Al confirmar, el depósito se registra en el libro contable y completa el requisito de depósito.'
            : 'Confirming posts this deposit to the ledger and completes the enrollment checklist item.'
        }
      >
        {reviewDeposit && (() => {
          const stu = state.students.find((s) => s.id === reviewDeposit.studentId);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-porcelain border border-borderwarm space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slatewarm">{t('receiptNumber')}</span>
                  <span className="font-mono font-semibold text-navy">
                    {reviewDeposit.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slatewarm">
                    {state.language === 'es' ? 'Alumna' : 'Student'}
                  </span>
                  <span className="font-semibold text-navy">{stu?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slatewarm">{t('amount')}</span>
                  <span className="font-semibold text-navy tabular-nums">
                    {formatCurrencyExact(reviewDeposit.amount, state.language)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slatewarm">{t('paymentMethod')}</span>
                  <span className="text-navy">
                    {t(`method_${reviewDeposit.method}` as TranslationKey)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slatewarm">{t('collector')}</span>
                  <span className="text-navy">{reviewDeposit.collectorName}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setReviewDeposit(null)}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={() => {
                    confirmDeposit(reviewDeposit.id);
                    setReviewDeposit(null);
                  }}
                >
                  {t('confirm')}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
