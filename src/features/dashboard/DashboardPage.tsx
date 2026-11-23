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
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  Package,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  formatCurrency,
  formatCurrencyExact,
  getStudentFinancialSummary,
  roundCurrency,
} from '../../calculations/paymentEngine';
import { Badge, Button, Modal } from '../../components/ui/Primitives';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import type { Deposit, PaymentMethod } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

type PeriodOption = 'this_week' | 'last_week' | 'this_month' | 'custom';
type BreakdownMode = 'method' | 'class' | 'collector' | 'category';

const TODAY = '2026-11-24';

function getPeriodRange(
  period: PeriodOption,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  if (period === 'this_week') return { start: '2026-11-18', end: '2026-11-24' };
  if (period === 'last_week') return { start: '2026-11-11', end: '2026-11-17' };
  if (period === 'this_month') return { start: '2026-11-01', end: '2026-11-30' };
  return { start: customStart || '2026-10-01', end: customEnd || TODAY };
}

export const DashboardPage: React.FC = () => {
  const { state, currentUser, confirmDeposit, t } = useApp();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodOption>('this_month');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [customStart, setCustomStart] = useState('2026-10-05');
  const [customEnd, setCustomEnd] = useState(TODAY);
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>('method');
  const [reviewDeposit, setReviewDeposit] = useState<Deposit | null>(null);

  const range = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const scopedPayments = useMemo(
    () =>
      state.payments.filter(
        (p) =>
          p.status === 'confirmed' &&
          (classFilter === 'all' ? true : p.classId === classFilter)
      ),
    [state.payments, classFilter]
  );

  const periodPayments = useMemo(
    () =>
      scopedPayments.filter((p) => p.date >= range.start && p.date <= range.end),
    [scopedPayments, range]
  );

  const scopedStudents = useMemo(
    () =>
      state.students.filter((s) =>
        classFilter === 'all' ? true : s.classId === classFilter
      ),
    [state.students, classFilter]
  );

  // All 10 Section 8.1 Owner Dashboard Metrics derived strictly from shared state
  const metrics = useMemo(() => {
    const collectedWeek = roundCurrency(
      scopedPayments
        .filter((p) => p.date >= '2026-11-18' && p.date <= '2026-11-24')
        .reduce((s, p) => s + p.amount, 0)
    );
    const collectedMonth = roundCurrency(
      scopedPayments
        .filter((p) => p.date >= '2026-11-01' && p.date <= '2026-11-30')
        .reduce((s, p) => s + p.amount, 0)
    );
    const selectedTotal = roundCurrency(
      periodPayments.reduce((s, p) => s + p.amount, 0)
    );

    const activeStudents = scopedStudents.filter(
      (s) => s.enrollmentStatus === 'enrolled' || s.enrollmentStatus === 'pending'
    );

    let outstandingBehind = 0;
    let remainingCourseBalances = 0;
    activeStudents.forEach((stu) => {
      const cls = state.classes.find((c) => c.id === stu.classId);
      const fin = getStudentFinancialSummary(stu, cls, state.payments, state.deposits);
      outstandingBehind += fin.behindSchedule;
      remainingCourseBalances += fin.remainingBalance;
    });

    const pendingEnrollments = scopedStudents.filter(
      (s) => s.enrollmentStatus === 'pending'
    ).length;

    const pendingDeposits = state.deposits.filter(
      (d) =>
        d.status === 'pending' &&
        (classFilter === 'all' ? true : d.classId === classFilter)
    );
    const pendingDepositsTotal = roundCurrency(
      pendingDeposits.reduce((s, d) => s + d.amount, 0)
    );

    const upcomingTours = state.tours.filter(
      (tr) => tr.date >= TODAY && tr.outcome === 'pending'
    ).length;

    const openMissed = state.missedClasses.filter(
      (m) =>
        m.makeupStatus !== 'cleared' &&
        (classFilter === 'all' ? true : m.classId === classFilter)
    ).length;

    const outstandingTasks = state.tasks.filter(
      (tk) => tk.status !== 'completed'
    ).length;

    return {
      collectedWeek,
      collectedMonth,
      selectedTotal,
      outstandingBehind: roundCurrency(outstandingBehind),
      remainingCourseBalances: roundCurrency(remainingCourseBalances),
      activeStudentsCount: activeStudents.length,
      pendingEnrollments,
      pendingDepositsCount: pendingDeposits.length,
      pendingDepositsTotal,
      upcomingTours,
      openMissed,
      outstandingTasks,
    };
  }, [scopedPayments, periodPayments, scopedStudents, state, classFilter]);

  // 8-Week Trend
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
      const inWeek = scopedPayments.filter((p) => p.date >= w.start && p.date <= w.end);
      const deposits = roundCurrency(
        inWeek.filter((p) => p.category === 'deposit').reduce((s, p) => s + p.amount, 0)
      );
      const weekly = roundCurrency(
        inWeek.filter((p) => p.category !== 'deposit').reduce((s, p) => s + p.amount, 0)
      );
      return { label: w.label, weekly, deposits };
    });
  }, [scopedPayments]);

  // Multi-lens Financial Breakdown (Section 8.2: payment type, class, collector, deposit vs weekly)
  const breakdownData = useMemo(() => {
    const map = new Map<string, { key: string; label: string; amount: number; count: number }>();

    periodPayments.forEach((p) => {
      let key = '';
      let label = '';
      if (breakdownMode === 'method') {
        key = p.method;
        label = t(`method_${p.method as PaymentMethod}` as TranslationKey);
      } else if (breakdownMode === 'class') {
        key = p.classId;
        label = state.classes.find((c) => c.id === p.classId)?.name ?? p.classId;
      } else if (breakdownMode === 'collector') {
        key = p.collectorId;
        label = p.collectorName;
      } else {
        key = p.category === 'deposit' ? 'deposit' : 'weekly';
        label =
          p.category === 'deposit'
            ? t('deposit')
            : state.language === 'es'
              ? 'Pagos Semanales / Primera Clase'
              : 'Weekly & First-Class Payments';
      }
      const existing = map.get(key) ?? { key, label, amount: 0, count: 0 };
      existing.amount = roundCurrency(existing.amount + p.amount);
      existing.count += 1;
      map.set(key, existing);
    });

    const list = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    const maxVal = Math.max(1, ...list.map((i) => i.amount));
    return list.map((item) => ({ ...item, pct: Math.round((item.amount / maxVal) * 100) }));
  }, [periodPayments, breakdownMode, state.classes, state.language, t]);

  // Priority Action Center (all 8 flags from Section 8.3)
  const priorities = useMemo(() => {
    const pendingDeposits = state.deposits.filter((d) => d.status === 'pending');
    const pendingEnrollments = state.students.filter((s) => s.enrollmentStatus === 'pending');
    const openMissed = state.missedClasses.filter((m) => m.makeupStatus !== 'cleared');
    const pastUnloggedTours = state.tours.filter((tr) => tr.date < TODAY && tr.outcome === 'pending');
    const lowStock = state.inventory.filter((i) => i.quantity <= 5);
    const overdueTasks = state.tasks.filter((tk) => tk.status !== 'completed' && tk.dueDate < TODAY);
    const unloggedWeeks = state.classes.filter(
      (c) =>
        c.status === 'active' &&
        !state.classLogSubmissions.some((s) => s.classId === c.id && s.week === c.currentWeek)
    );
    const urgentReports = state.reports.filter(
      (r) => r.status !== 'resolved' && (r.urgency === 'urgent' || r.urgency === 'high')
    );

    return {
      pendingDeposits,
      pendingEnrollments,
      openMissed,
      pastUnloggedTours,
      lowStock,
      overdueTasks,
      unloggedWeeks,
      urgentReports,
    };
  }, [state]);

  const handleBreakdownClick = (key: string) => {
    if (breakdownMode === 'method') navigate(`/app/accounting?method=${key}`);
    else if (breakdownMode === 'collector') navigate(`/app/accounting?collector=${key}`);
    else if (breakdownMode === 'class') navigate(`/app/accounting?classId=${key}`);
    else navigate('/app/accounting');
  };

  return (
    <div className="space-y-7">
      {/* Editorial Top Command Strip */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between pb-5 border-b border-hairline">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">
            {state.language === 'es'
              ? 'MARTES, 24 DE NOVIEMBRE DE 2026 · LA VOUTE ATELIER'
              : 'TUESDAY, NOVEMBER 24, 2026 · LA VOUTE ATELIER'}
          </div>
          <h1 className="font-editorial text-[30px] sm:text-[36px] text-charcoal leading-tight mt-1">
            {t('goodMorning')}, {currentUser?.firstName ?? 'Rudy'}.
          </h1>
          <p className="text-sm text-softgray mt-0.5">{t('dashboardSub')}</p>
        </div>

        {/* Date Range + Class Filter + Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white border border-hairline rounded-lg p-0.5 flex-wrap">
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
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === val
                    ? 'bg-olive text-white'
                    : 'text-softgray hover:text-charcoal'
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white border border-hairline rounded-lg px-2.5 py-1.5 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-charcoal"
              />
              <span className="text-softgray">–</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-charcoal"
              />
            </div>
          )}

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter dashboard by class"
            className="h-9 px-3 text-xs font-medium rounded-lg border border-hairline bg-white text-charcoal"
          >
            <option value="all">
              {state.language === 'es' ? 'Todas las clases' : 'All Classes'}
            </option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Button size="sm" onClick={() => navigate('/app/payments')}>
            <Plus className="w-3.5 h-3.5" />
            {state.language === 'es' ? 'Cobro' : 'Record Payment'}
          </Button>
        </div>
      </div>

      {/* ARCHITECTURAL HAIRLINE-DIVIDED METRIC RIBBON (All 10 Section 8.1 Metrics — NOT identical floating cards!) */}
      <section className="bg-white border border-hairline rounded-atelier overflow-hidden">
        {/* Primary Financial Row (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
          <button
            type="button"
            onClick={() => navigate('/app/accounting')}
            className="p-5 text-left hover:bg-porcelain/60 transition-colors"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-softgray">
              {t('kpiCollectedWeek')}
            </div>
            <div className="font-editorial text-3xl text-charcoal tabular-nums mt-1.5">
              <AnimatedNumber
                value={metrics.collectedWeek}
                formatter={(v) => formatCurrency(Math.round(v), state.language)}
              />
            </div>
            <div className="text-xs text-status-green mt-1">
              {state.language === 'es' ? 'Periodo activo:' : 'Selected range:'}{' '}
              <AnimatedNumber
                value={metrics.selectedTotal}
                formatter={(v) => formatCurrency(Math.round(v), state.language)}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/accounting')}
            className="p-5 text-left hover:bg-porcelain/60 transition-colors"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-softgray">
              {t('kpiCollectedMonth')}
            </div>
            <div className="font-editorial text-3xl text-charcoal tabular-nums mt-1.5">
              <AnimatedNumber
                value={metrics.collectedMonth}
                formatter={(v) => formatCurrency(Math.round(v), state.language)}
              />
            </div>
            <div className="text-xs text-softgray mt-1">
              {state.language === 'es' ? 'Noviembre 2026' : 'November 2026'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/accounting')}
            className="p-5 text-left hover:bg-porcelain/60 transition-colors"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-softgray">
              {t('kpiOutstandingBalances')}
            </div>
            <div className="font-editorial text-3xl text-clay-dark tabular-nums mt-1.5">
              <AnimatedNumber
                value={metrics.outstandingBehind}
                formatter={(v) => formatCurrency(Math.round(v), state.language)}
              />
            </div>
            <div className="text-xs text-softgray mt-1">
              {state.language === 'es' ? 'Atrasos acumulados a la fecha' : 'Behind-schedule arrears to date'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/accounting')}
            className="p-5 text-left hover:bg-porcelain/60 transition-colors"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-softgray">
              {t('kpiRemainingCourse')}
            </div>
            <div className="font-editorial text-3xl text-charcoal tabular-nums mt-1.5">
              <AnimatedNumber
                value={metrics.remainingCourseBalances}
                formatter={(v) => formatCurrency(Math.round(v), state.language)}
              />
            </div>
            <div className="text-xs text-softgray mt-1">
              {state.language === 'es' ? 'Saldo total restante en cursos' : 'Total remaining contract tuition'}
            </div>
          </button>
        </div>

        {/* Secondary Operational Strip (6 compact indicators on Mist band) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-hairline bg-porcelain/65 divide-y sm:divide-y-0 sm:divide-x divide-hairline text-xs">
          {[
            { label: t('kpiActiveStudents'), value: metrics.activeStudentsCount, route: '/app/students' },
            { label: t('kpiPendingEnrollments'), value: metrics.pendingEnrollments, route: '/app/students', highlight: metrics.pendingEnrollments > 0 },
            { label: t('kpiPendingDeposits'), value: `${metrics.pendingDepositsCount} (${formatCurrency(metrics.pendingDepositsTotal, state.language)})`, route: '/app/deposits', highlight: metrics.pendingDepositsCount > 0 },
            { label: t('kpiUpcomingTours'), value: metrics.upcomingTours, route: '/app/studio-tours' },
            { label: t('kpiOpenMissed'), value: metrics.openMissed, route: '/app/missed-classes', highlight: metrics.openMissed > 0 },
            { label: t('kpiOutstandingTasks'), value: metrics.outstandingTasks, route: '/app/tasks' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.route)}
              className="px-4 py-3 text-left hover:bg-mist/70 transition-colors"
            >
              <div className="text-[10.5px] text-softgray truncate">{item.label}</div>
              <div
                className={`text-sm font-semibold tabular-nums mt-0.5 ${
                  item.highlight ? 'text-clay-dark' : 'text-charcoal'
                }`}
              >
                {item.value}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ASYMMETRICAL 8 / 4 WORKSPACE SPLIT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
        {/* LEFT 8 COLUMNS: Visualizations + Active Cohorts + Recent Activity */}
        <div className="xl:col-span-8 space-y-7">
          {/* 8-Week Collection Trend */}
          <section className="bg-white border border-hairline rounded-atelier p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="font-editorial text-2xl text-charcoal">
                  {t('collectionsTrendTitle')}
                </h2>
                <p className="text-xs text-softgray">
                  {state.language === 'es'
                    ? 'Pagos semanales y depósitos confirmados en el periodo.'
                    : 'Weekly tuition payments vs. confirmed deposits derived live from the ledger.'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-softgray">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-olive" />
                  {state.language === 'es' ? 'Pagos Semanales' : 'Weekly Payments'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-clay" />
                  {t('deposit')}
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eightWeekTrend} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EAE3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#858780', fontSize: 11 }} axisLine={{ stroke: '#DDDCD4' }} tickLine={false} />
                  <YAxis tick={{ fill: '#858780', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    cursor={{ fill: '#F7F5F0' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DDDCD4',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#292D29',
                    }}
                    formatter={(val: number, name: string) => [
                      formatCurrencyExact(val, state.language),
                      name === 'weekly'
                        ? state.language === 'es'
                          ? 'Pagos Semanales'
                          : 'Weekly Payments'
                        : t('deposit'),
                    ]}
                  />
                  <Bar dataKey="weekly" stackId="a" fill="#424D40" animationDuration={450} />
                  <Bar dataKey="deposits" stackId="a" fill="#BD806B" radius={[4, 4, 0, 0]} animationDuration={450} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Multi-Lens Financial Breakdown (Section 8.2) */}
          <section className="bg-white border border-hairline rounded-atelier p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-editorial text-2xl text-charcoal">
                  {t('collectionsBreakdownTitle')}
                </h2>
                <p className="text-xs text-softgray">
                  {state.language === 'es'
                    ? 'Haz clic en cualquier segmento para abrir el reporte filtrado en Contabilidad.'
                    : 'Click any row to cross-filter matching records in Accounting.'}
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-hairline bg-porcelain p-0.5 flex-wrap">
                {(
                  [
                    ['method', state.language === 'es' ? 'Método' : 'Type'],
                    ['class', state.language === 'es' ? 'Clase' : 'Class'],
                    ['collector', state.language === 'es' ? 'Cobrador' : 'Collector'],
                    ['category', state.language === 'es' ? 'Dep. vs Sem.' : 'Deposit vs Weekly'],
                  ] as [BreakdownMode, string][]
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBreakdownMode(m)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      breakdownMode === m
                        ? 'bg-olive text-white'
                        : 'text-softgray hover:text-charcoal'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {breakdownData.length === 0 ? (
              <div className="py-8 text-center text-xs text-softgray">{t('noResults')}</div>
            ) : (
              <div className="space-y-3.5">
                {breakdownData.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => handleBreakdownClick(row.key)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-charcoal group-hover:text-olive transition-colors">
                        {row.label}
                      </span>
                      <span className="tabular-nums font-semibold text-charcoal">
                        {formatCurrencyExact(row.amount, state.language)}{' '}
                        <span className="text-softgray font-normal">({row.count})</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-mist rounded-full overflow-hidden">
                      <div
                        className="h-full bg-olive group-hover:bg-clay rounded-full transition-all duration-300"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Active Cohorts Structured Table */}
          <section className="bg-white border border-hairline rounded-atelier overflow-hidden">
            <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
              <h2 className="font-editorial text-2xl text-charcoal">
                {t('classOverviewTitle')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/classes')}>
                {state.language === 'es' ? 'Ver todas' : 'Manage classes'}
              </Button>
            </div>
            <div className="divide-y divide-hairline">
              {state.classes.map((cls) => {
                const roster = state.students.filter((s) => s.classId === cls.id);
                const instructors = state.users
                  .filter((u) => cls.instructorIds.includes(u.id))
                  .map((u) => u.name)
                  .join(', ');
                const expectedTotal = roster.reduce((s, st) => s + st.courseTotal, 0);
                const collectedTotal = roster.reduce(
                  (s, st) =>
                    s +
                    getStudentFinancialSummary(st, cls, state.payments, state.deposits)
                      .totalPaid,
                  0
                );
                const pct =
                  expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;
                const logged = state.classLogSubmissions.some(
                  (sub) => sub.classId === cls.id && sub.week === cls.currentWeek
                );

                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => navigate(`/app/classes?classId=${cls.id}`)}
                    className="w-full p-5 text-left hover:bg-porcelain/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-charcoal text-sm">
                          {cls.name}
                        </span>
                        <Badge tone={logged ? 'green' : 'amber'}>
                          W{cls.currentWeek}/{cls.weeks}
                        </Badge>
                      </div>
                      <div className="text-xs text-softgray mt-0.5">
                        {cls.program} · {cls.weekday} · {instructors} · {roster.length} students
                      </div>
                    </div>
                    <div className="sm:w-48 shrink-0">
                      <div className="flex justify-between text-xs mb-1 tabular-nums">
                        <span className="font-semibold text-charcoal">
                          {formatCurrency(collectedTotal, state.language)}
                        </span>
                        <span className="text-softgray">
                          / {formatCurrency(expectedTotal, state.language)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-mist rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sage-dark rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent Activity Feed */}
          <section className="bg-white border border-hairline rounded-atelier overflow-hidden">
            <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-olive" />
                <h2 className="font-editorial text-2xl text-charcoal">
                  {t('recentActivityTitle')}
                </h2>
              </div>
              <span className="text-xs text-softgray">
                {state.language === 'es' ? 'Libro compartido en vivo' : 'Live shared activity'}
              </span>
            </div>
            <div className="divide-y divide-hairline">
              {state.activities.slice(0, 7).map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => navigate(act.targetRoute)}
                  className="w-full px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-left hover:bg-porcelain/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-charcoal">{act.title}</div>
                    <div className="text-xs text-softgray truncate">{act.detail}</div>
                  </div>
                  <div className="text-xs text-softgray shrink-0">
                    {act.actorName} · <span className="tabular-nums">{act.timestamp.slice(0, 10)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT 4 COLUMNS (STICKY): PRIORITY ACTION CENTER (Section 8.3) */}
        <aside className="xl:col-span-4 xl:sticky xl:top-20 space-y-4">
          <div className="bg-charcoal text-porcelain rounded-atelier p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/15">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-clay">
                  {state.language === 'es' ? 'ATENCIÓN REQUERIDA' : 'REQUIRES ATTENTION'}
                </div>
                <h2 className="font-editorial text-2xl text-white mt-0.5">
                  {t('alertsTitle')}
                </h2>
              </div>
              <span className="w-8 h-8 rounded-full bg-clay/20 text-clay flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Pending Deposits with Inline Confirm */}
              {priorities.pendingDeposits.map((dep) => {
                const stu = state.students.find((s) => s.id === dep.studentId);
                return (
                  <div
                    key={dep.id}
                    className="p-3.5 rounded-lg bg-white/[0.06] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-clay uppercase tracking-wider">
                        {state.language === 'es' ? 'Depósito Pendiente' : 'Pending Deposit'}
                      </span>
                      <span className="font-mono text-mist/70">{dep.receiptNumber}</span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {stu?.fullName} — {formatCurrency(dep.amount, state.language)}
                    </div>
                    <div className="text-xs text-mist/75">
                      {dep.collectorName} · {t(`method_${dep.method}` as TranslationKey)} · {dep.date}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="clay" onClick={() => setReviewDeposit(dep)}>
                        {state.language === 'es' ? 'Confirmar' : 'Review & Confirm'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/students?studentId=${dep.studentId}`)}
                        className="text-xs text-mist/80 hover:text-white underline"
                      >
                        {state.language === 'es' ? 'Perfil' : 'Student'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Urgent Reports */}
              {priorities.urgentReports.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => navigate('/app/weekly-reports')}
                  className="w-full text-left p-3.5 rounded-lg bg-status-red/20 border border-status-red/40 hover:bg-status-red/30 transition-colors"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-clay-light">
                    {state.language === 'es' ? 'Reporte Urgente' : 'Urgent Staff Report'}
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">{rep.subject}</div>
                  <div className="text-xs text-mist/80 mt-0.5">
                    {rep.submittedByName} · {rep.date}
                  </div>
                </button>
              ))}

              {/* Compact Priority Links */}
              <div className="divide-y divide-white/10 pt-1">
                {[
                  priorities.unloggedWeeks.length > 0 && {
                    label: state.language === 'es' ? 'Semanas sin registrar' : 'Class weeks not logged',
                    detail: priorities.unloggedWeeks.map((c) => `${c.name} (W${c.currentWeek})`).join(', '),
                    route: '/app/class-log',
                    icon: Clock,
                  },
                  priorities.pendingEnrollments.length > 0 && {
                    label: t('kpiPendingEnrollments'),
                    detail: `${priorities.pendingEnrollments.length} incomplete 4-step checklists`,
                    route: '/app/students',
                    icon: CheckCircle2,
                  },
                  priorities.openMissed.length > 0 && {
                    label: state.language === 'es' ? 'Clases perdidas abiertas' : 'Missed classes open',
                    detail: `${priorities.openMissed.length} awaiting makeup or clearance`,
                    route: '/app/missed-classes',
                    icon: Clock,
                  },
                  priorities.pastUnloggedTours.length > 0 && {
                    label: state.language === 'es' ? 'Visitas sin resultado' : 'Past tours without outcome',
                    detail: priorities.pastUnloggedTours.map((tr) => tr.visitorName).join(', '),
                    route: '/app/studio-tours',
                    icon: AlertTriangle,
                  },
                  priorities.lowStock.length > 0 && {
                    label: state.language === 'es' ? 'Productos en Pedir Ahora' : 'Low-stock products (≤5)',
                    detail: `${priorities.lowStock.length} items need reorder`,
                    route: '/app/inventory',
                    icon: Package,
                  },
                  priorities.overdueTasks.length > 0 && {
                    label: state.language === 'es' ? 'Tareas vencidas' : 'Overdue tasks',
                    detail: `${priorities.overdueTasks.length} overdue`,
                    route: '/app/tasks',
                    icon: AlertTriangle,
                  },
                ]
                  .filter((x): x is { label: string; detail: string; route: string; icon: typeof Clock } => Boolean(x))
                  .map((row) => (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => navigate(row.route)}
                      className="w-full py-3 flex items-center justify-between gap-3 text-left hover:opacity-85 transition-opacity"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white">{row.label}</div>
                        <div className="text-[11.5px] text-mist/70 truncate">{row.detail}</div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-clay shrink-0" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Deposit Confirmation Modal */}
      <Modal
        open={Boolean(reviewDeposit)}
        onClose={() => setReviewDeposit(null)}
        title={state.language === 'es' ? 'Confirmar Depósito' : 'Confirm Student Deposit'}
        subtitle={
          state.language === 'es'
            ? 'Al confirmar se actualiza el saldo y el primer paso de inscripción.'
            : 'Confirming posts this deposit to the ledger and completes enrollment checklist step 1.'
        }
      >
        {reviewDeposit && (() => {
          const stu = state.students.find((s) => s.id === reviewDeposit.studentId);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-atelier bg-porcelain border border-hairline space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-softgray">{t('receiptNumber')}</span>
                  <span className="font-mono font-semibold text-charcoal">
                    {reviewDeposit.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-softgray">{state.language === 'es' ? 'Alumna' : 'Student'}</span>
                  <span className="font-semibold text-charcoal">{stu?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-softgray">{t('amount')}</span>
                  <span className="font-semibold text-charcoal tabular-nums">
                    {formatCurrencyExact(reviewDeposit.amount, state.language)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-softgray">{t('collector')}</span>
                  <span className="text-charcoal">{reviewDeposit.collectorName}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
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
