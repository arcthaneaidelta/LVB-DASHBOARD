import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Download,
  FileSpreadsheet,
  RotateCcw,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  formatCurrency,
  formatCurrencyExact,
  getStudentFinancialSummary,
  roundCurrency,
  summarizePaymentsByMethod,
} from '../../calculations/paymentEngine';
import {
  exportToCsv,
  generateTableReportPdf,
} from '../../services/pdfExport';
import {
  Badge,
  Button,
  Card,
  KpiCard,
  PageHeader,
} from '../../components/ui/Primitives';
import type { PaymentMethod } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

type AccountingTab = 'collections' | 'balances' | 'reconciliation' | 'reporting';
type DatePreset = 'all' | 'this_week' | 'last_week' | 'this_month' | 'custom';
type GroupBy = 'day' | 'class' | 'method' | 'collector';

const METHODS: PaymentMethod[] = ['cash', 'card', 'zelle', 'venmo', 'cash_app', 'check', 'other'];

export const AccountingPage: React.FC = () => {
  const { state, pushToast, t } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<AccountingTab>('collections');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState('2026-10-01');
  const [customEnd, setCustomEnd] = useState('2026-11-30');
  const [classFilter, setClassFilter] = useState(searchParams.get('classId') ?? 'all');
  const [methodFilter, setMethodFilter] = useState(searchParams.get('method') ?? 'all');
  const [collectorFilter, setCollectorFilter] = useState(
    searchParams.get('collector') ?? 'all'
  );
  const [groupBy, setGroupBy] = useState<GroupBy>('method');

  const dateRange = useMemo(() => {
    if (datePreset === 'this_week') return { start: '2026-11-18', end: '2026-11-24' };
    if (datePreset === 'last_week') return { start: '2026-11-11', end: '2026-11-17' };
    if (datePreset === 'this_month') return { start: '2026-11-01', end: '2026-11-30' };
    if (datePreset === 'custom') return { start: customStart, end: customEnd };
    return { start: '2026-01-01', end: '2026-12-31' };
  }, [datePreset, customStart, customEnd]);

  const confirmedPayments = useMemo(
    () => state.payments.filter((p) => p.status === 'confirmed'),
    [state.payments]
  );

  const filteredPayments = useMemo(() => {
    return confirmedPayments
      .filter((p) => p.date >= dateRange.start && p.date <= dateRange.end)
      .filter((p) => (classFilter === 'all' ? true : p.classId === classFilter))
      .filter((p) => (methodFilter === 'all' ? true : p.method === methodFilter))
      .filter((p) => (collectorFilter === 'all' ? true : p.collectorId === collectorFilter))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [confirmedPayments, dateRange, classFilter, methodFilter, collectorFilter]);

  const overview = useMemo(() => {
    const filteredSum = summarizePaymentsByMethod(filteredPayments);
    const weeklyTotal = confirmedPayments
      .filter((p) => p.date >= '2026-11-18' && p.date <= '2026-11-24')
      .reduce((s, p) => s + p.amount, 0);
    const monthlyTotal = confirmedPayments
      .filter((p) => p.date >= '2026-11-01' && p.date <= '2026-11-30')
      .reduce((s, p) => s + p.amount, 0);
    const outstanding = state.students.reduce((sum, stu) => {
      const cls = state.classes.find((c) => c.id === stu.classId);
      return sum + getStudentFinancialSummary(stu, cls, state.payments, state.deposits).remainingBalance;
    }, 0);
    const confirmedDeposits = confirmedPayments
      .filter((p) => p.category === 'deposit')
      .reduce((s, p) => s + p.amount, 0);
    const pendingDeposits = state.deposits
      .filter((d) => d.status === 'pending')
      .reduce((s, d) => s + d.amount, 0);
    const cashAwaitingReconciliation = state.cashHandoffs
      .filter((h) => h.status !== 'confirmed')
      .reduce((s, h) => s + h.expectedCash, 0);

    return {
      filteredSum,
      weeklyTotal: roundCurrency(weeklyTotal),
      monthlyTotal: roundCurrency(monthlyTotal),
      outstanding: roundCurrency(outstanding),
      confirmedDeposits: roundCurrency(confirmedDeposits),
      pendingDeposits: roundCurrency(pendingDeposits),
      cashAwaitingReconciliation: roundCurrency(cashAwaitingReconciliation),
    };
  }, [filteredPayments, confirmedPayments, state]);

  const groupedBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        count: number;
        total: number;
        cash: number;
        digital: number;
        deposits: number;
        weekly: number;
      }
    >();

    filteredPayments.forEach((p) => {
      let key = '';
      let label = '';
      if (groupBy === 'day') {
        key = p.date;
        label = p.date;
      } else if (groupBy === 'class') {
        key = p.classId;
        label = state.classes.find((c) => c.id === p.classId)?.name ?? p.classId;
      } else if (groupBy === 'method') {
        key = p.method;
        label = t(`method_${p.method}` as TranslationKey);
      } else {
        key = p.collectorId;
        label = p.collectorName;
      }

      const row = map.get(key) ?? {
        key,
        label,
        count: 0,
        total: 0,
        cash: 0,
        digital: 0,
        deposits: 0,
        weekly: 0,
      };
      row.count += 1;
      row.total = roundCurrency(row.total + p.amount);
      if (p.method === 'cash') row.cash = roundCurrency(row.cash + p.amount);
      if (p.method === 'zelle' || p.method === 'venmo' || p.method === 'cash_app') {
        row.digital = roundCurrency(row.digital + p.amount);
      }
      if (p.category === 'deposit') row.deposits = roundCurrency(row.deposits + p.amount);
      else row.weekly = roundCurrency(row.weekly + p.amount);
      map.set(key, row);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredPayments, groupBy, state.classes, t]);

  const studentBalances = useMemo(() => {
    return state.students
      .filter((s) => (classFilter === 'all' ? true : s.classId === classFilter))
      .map((stu) => {
        const cls = state.classes.find((c) => c.id === stu.classId);
        const fin = getStudentFinancialSummary(stu, cls, state.payments, state.deposits);
        const missedCount = state.missedClasses.filter(
          (m) => m.studentId === stu.id && m.makeupStatus !== 'cleared'
        ).length;
        return { stu, cls, fin, missedCount };
      });
  }, [state.students, state.classes, state.payments, state.deposits, state.missedClasses, classFilter]);

  const reconciliationSummary = useMemo(() => {
    const expectedAllCash = confirmedPayments
      .filter((p) => p.method === 'cash')
      .reduce((s, p) => s + p.amount, 0);
    const submittedCash = state.cashHandoffs.reduce((s, h) => s + h.expectedCash, 0);
    const confirmedCash = state.cashHandoffs
      .filter((h) => h.status === 'confirmed')
      .reduce((s, h) => s + (h.receivedCash ?? h.expectedCash), 0);
    const totalVariance = state.cashHandoffs
      .filter((h) => h.variance !== undefined)
      .reduce((s, h) => s + (h.variance ?? 0), 0);
    return {
      expectedAllCash: roundCurrency(expectedAllCash),
      submittedCash: roundCurrency(submittedCash),
      confirmedCash: roundCurrency(confirmedCash),
      totalVariance: roundCurrency(totalVariance),
    };
  }, [confirmedPayments, state.cashHandoffs]);

  const hasActiveFilters =
    datePreset !== 'all' ||
    classFilter !== 'all' ||
    methodFilter !== 'all' ||
    collectorFilter !== 'all';

  const resetAllFilters = () => {
    setDatePreset('all');
    setClassFilter('all');
    setMethodFilter('all');
    setCollectorFilter('all');
    setSearchParams({});
  };

  const handleSegmentFilter = (key: string) => {
    if (groupBy === 'class') setClassFilter(key);
    else if (groupBy === 'method') setMethodFilter(key);
    else if (groupBy === 'collector') setCollectorFilter(key);
  };

  const filterSummaryText = `Period: ${dateRange.start}..${dateRange.end} | Class: ${classFilter} | Method: ${methodFilter}`;

  // Report Exporters (PRD Section 25)
  const exportCollectionsReport = (format: 'pdf' | 'csv') => {
    const headers = ['Receipt #', 'Date', 'Student', 'Class', 'Category', 'Method', 'Collector', 'Amount'];
    const rows = filteredPayments.map((p) => [
      p.receiptNumber,
      p.date,
      state.students.find((s) => s.id === p.studentId)?.fullName ?? p.studentId,
      state.classes.find((c) => c.id === p.classId)?.name ?? p.classId,
      p.category,
      p.method,
      p.collectorName,
      p.amount.toFixed(2),
    ]);
    if (format === 'csv') {
      exportToCsv(headers, rows, 'LVB_Collections_Report.csv');
    } else {
      generateTableReportPdf({
        title: state.language === 'es' ? 'Reporte de Cobranza' : 'Collections Report',
        dateRangeLabel: `${dateRange.start} – ${dateRange.end}`,
        filterSummary: filterSummaryText,
        headers,
        rows,
        totalsLine: `Total: ${formatCurrencyExact(overview.filteredSum.overallTotal, state.language)} | Cash: ${formatCurrencyExact(overview.filteredSum.cashTotal, state.language)} | Deposits: ${formatCurrencyExact(overview.filteredSum.depositTotal, state.language)}`,
        filename: 'LVB_Collections_Report',
        language: state.language,
      });
    }
    pushToast(t('toastExportSuccess'));
  };

  const exportStudentBalancesReport = (format: 'pdf' | 'csv') => {
    const headers = ['Student', 'Class', 'Course Total', 'Paid', 'Remaining', 'Due to Date', 'Behind', 'Open Missed'];
    const rows = studentBalances.map(({ stu, cls, fin, missedCount }) => [
      stu.fullName,
      cls?.name ?? '',
      fin.courseTotal.toFixed(2),
      fin.totalPaid.toFixed(2),
      fin.remainingBalance.toFixed(2),
      fin.dueToDate.toFixed(2),
      fin.behindSchedule.toFixed(2),
      missedCount,
    ]);
    if (format === 'csv') {
      exportToCsv(headers, rows, 'LVB_Student_Balances_Report.csv');
    } else {
      generateTableReportPdf({
        title: state.language === 'es' ? 'Reporte de Saldos de Alumnas' : 'Student Balances Report',
        dateRangeLabel: 'As of 2026-11-24',
        filterSummary: `Class: ${classFilter}`,
        headers,
        rows,
        totalsLine: `Total Outstanding Balances: ${formatCurrencyExact(overview.outstanding, state.language)}`,
        filename: 'LVB_Student_Balances_Report',
        language: state.language,
      });
    }
    pushToast(t('toastExportSuccess'));
  };

  const exportAttendanceReport = (format: 'pdf' | 'csv') => {
    const headers = ['Student', 'Class', 'Week', 'Date', 'Status', 'Notes'];
    const rows = state.attendance.map((a) => [
      state.students.find((s) => s.id === a.studentId)?.fullName ?? a.studentId,
      state.classes.find((c) => c.id === a.classId)?.name ?? a.classId,
      `W${a.week}`,
      a.date,
      a.status,
      a.notes,
    ]);
    if (format === 'csv') exportToCsv(headers, rows, 'LVB_Attendance_Report.csv');
    else
      generateTableReportPdf({
        title: state.language === 'es' ? 'Reporte de Asistencia' : 'Attendance & Follow-Up Report',
        dateRangeLabel: 'All Recorded Sessions',
        filterSummary: `Open Makeups: ${state.missedClasses.filter((m) => m.makeupStatus !== 'cleared').length}`,
        headers,
        rows,
        filename: 'LVB_Attendance_Report',
        language: state.language,
      });
    pushToast(t('toastExportSuccess'));
  };

  const exportEnrollmentsReport = (format: 'pdf' | 'csv') => {
    const headers = ['Student', 'Program', 'Enrollment Date', 'Contract Value', 'Enrolled By', 'Source', 'Status'];
    const rows = state.students.map((s) => [
      s.fullName,
      s.program,
      s.enrollmentDate,
      s.courseTotal.toFixed(2),
      s.enrolledByName,
      s.source,
      s.enrollmentStatus,
    ]);
    const totalContract = state.students.reduce((sum, s) => sum + s.courseTotal, 0);
    if (format === 'csv') exportToCsv(headers, rows, 'LVB_Enrollments_Report.csv');
    else
      generateTableReportPdf({
        title: state.language === 'es' ? 'Reporte de Inscripciones' : 'Enrollments Report',
        dateRangeLabel: 'Active Cohorts',
        filterSummary: `Students: ${state.students.length}`,
        headers,
        rows,
        totalsLine: `Total Contract Value: ${formatCurrencyExact(totalContract, state.language)}`,
        filename: 'LVB_Enrollments_Report',
        language: state.language,
      });
    pushToast(t('toastExportSuccess'));
  };

  const exportToursReport = (format: 'pdf' | 'csv') => {
    const headers = ['Visitor', 'Date', 'Time', 'Program Interest', 'Staff', 'Outcome'];
    const rows = state.tours.map((tr) => [
      tr.visitorName,
      tr.date,
      tr.time,
      tr.programInterest,
      tr.assignedStaffName,
      tr.outcome,
    ]);
    if (format === 'csv') exportToCsv(headers, rows, 'LVB_Tours_Report.csv');
    else
      generateTableReportPdf({
        title: state.language === 'es' ? 'Reporte de Visitas al Estudio' : 'Studio Tours Report',
        dateRangeLabel: 'All Tours',
        filterSummary: `Total Booked: ${state.tours.length}`,
        headers,
        rows,
        filename: 'LVB_Tours_Report',
        language: state.language,
      });
    pushToast(t('toastExportSuccess'));
  };

  const exportInventoryReport = (format: 'pdf' | 'csv') => {
    const headers = ['SKU', 'Product', 'Category', 'Qty', 'Status', 'Unit Cost', 'Total Value', 'Lead Time'];
    const rows = state.inventory.map((i) => [
      i.sku,
      i.name,
      i.category,
      i.quantity,
      i.quantity <= 5 ? 'Order Now' : i.quantity < 10 ? 'Reorder Soon' : 'Normal',
      i.unitCost.toFixed(2),
      (i.quantity * i.unitCost).toFixed(2),
      i.leadTimeFlag,
    ]);
    const totalVal = state.inventory.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    if (format === 'csv') exportToCsv(headers, rows, 'LVB_Inventory_Valuation_Report.csv');
    else
      generateTableReportPdf({
        title: state.language === 'es' ? 'Reporte de Inventario y Valuación' : 'Inventory & Lead-Time Report',
        dateRangeLabel: 'As of 2026-11-24',
        filterSummary: `101 Products | Order Now: ${state.inventory.filter((i) => i.quantity <= 5).length}`,
        headers,
        rows,
        totalsLine: `Total Inventory Investment Value: ${formatCurrencyExact(totalVal, state.language)}`,
        filename: 'LVB_Inventory_Valuation_Report',
        language: state.language,
      });
    pushToast(t('toastExportSuccess'));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_accounting')}
        phase={t('phase1')}
        subtitle={
          state.language === 'es'
            ? 'Centro financiero para propietarios: cobranza, saldos de alumnas, conciliación de efectivo y centro de reportes PDF/CSV.'
            : 'Owner-only financial intelligence center: live collections, student balances, cash reconciliation, and branded PDF/CSV reporting.'
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => exportCollectionsReport('csv')}>
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t('exportCsv')}
            </Button>
            <Button size="sm" onClick={() => exportCollectionsReport('pdf')}>
              <Download className="w-3.5 h-3.5" />
              {t('exportPdf')}
            </Button>
          </div>
        }
      />

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label={state.language === 'es' ? 'Cobrado (Filtrado)' : 'Filtered Collected'}
          value={formatCurrencyExact(overview.filteredSum.overallTotal, state.language)}
          subtext={`${overview.filteredSum.count} ${state.language === 'es' ? 'transacciones' : 'transactions'}`}
          tone="sage"
        />
        <KpiCard
          label={t('kpiOutstandingBalances')}
          value={formatCurrencyExact(overview.outstanding, state.language)}
          subtext={state.language === 'es' ? 'Todas las alumnas' : 'Across all enrolled students'}
          tone="amber"
        />
        <KpiCard
          label={state.language === 'es' ? 'Depósitos Confirmados' : 'Confirmed Deposits'}
          value={formatCurrencyExact(overview.confirmedDeposits, state.language)}
          subtext={`${formatCurrency(overview.pendingDeposits, state.language)} ${state.language === 'es' ? 'pendientes' : 'pending'}`}
        />
        <KpiCard
          label={state.language === 'es' ? 'Efectivo Por Conciliar' : 'Cash Awaiting Reconciliation'}
          value={formatCurrencyExact(overview.cashAwaitingReconciliation, state.language)}
          tone={overview.cashAwaitingReconciliation > 0 ? 'terracotta' : 'sage'}
          onClick={() => setTab('reconciliation')}
        />
      </div>

      {/* Filters Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', t('all')],
              ['this_week', t('periodThisWeek')],
              ['last_week', t('periodLastWeek')],
              ['this_month', t('periodThisMonth')],
              ['custom', t('periodCustom')],
            ] as [DatePreset, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setDatePreset(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                datePreset === val
                  ? 'bg-olive text-white border-olive'
                  : 'bg-porcelain text-charcoal border-hairline'
              }`}
            >
              {label}
            </button>
          ))}

          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-porcelain border border-hairline rounded-lg px-2.5 py-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs bg-transparent"
              />
              <span className="text-xs text-softgray">–</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs bg-transparent"
              />
            </div>
          )}

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-hairline bg-porcelain"
          >
            <option value="all">{state.language === 'es' ? 'Todas las clases' : 'All classes'}</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-hairline bg-porcelain"
          >
            <option value="all">{state.language === 'es' ? 'Todos los métodos' : 'All payment types'}</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`method_${m}` as TranslationKey)}
              </option>
            ))}
          </select>

          <select
            value={collectorFilter}
            onChange={(e) => setCollectorFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-hairline bg-porcelain"
          >
            <option value="all">{state.language === 'es' ? 'Todos los cobradores' : 'All collectors'}</option>
            {state.users
              .filter((u) => u.role !== 'staff')
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetAllFilters}>
              <RotateCcw className="w-3.5 h-3.5" />
              {t('resetFilters')}
            </Button>
          )}
        </div>
      </Card>

      {/* Module Tabs */}
      <div className="flex items-center gap-1 bg-white border border-hairline rounded-xl p-1 overflow-x-auto">
        {(
          [
            ['collections', state.language === 'es' ? 'Desglose de Cobranza' : 'Collections Breakdown'],
            ['balances', state.language === 'es' ? 'Saldos de Alumnas' : 'Student Balances'],
            ['reconciliation', state.language === 'es' ? 'Conciliación de Efectivo' : 'Cash Reconciliation'],
            ['reporting', state.language === 'es' ? 'Centro de Reportes' : 'Reporting Center'],
          ] as [AccountingTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-olive text-white' : 'text-softgray hover:text-charcoal'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Collections Breakdown */}
      {tab === 'collections' && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-semibold text-charcoal">
                  {state.language === 'es'
                    ? 'Agrupar Cobranza Interactivamente'
                    : 'Interactive Collections Breakdown'}
                </h2>
                <p className="text-xs text-softgray">
                  {state.language === 'es'
                    ? 'Haz clic en una fila o barra para aplicar el filtro instantáneamente.'
                    : 'Click any bar or row to cross-filter matching payment records below.'}
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-hairline bg-porcelain p-0.5">
                {(
                  [
                    ['method', state.language === 'es' ? 'Método' : 'Method'],
                    ['collector', state.language === 'es' ? 'Cobrador' : 'Collector'],
                    ['class', state.language === 'es' ? 'Clase' : 'Class'],
                    ['day', state.language === 'es' ? 'Día' : 'Day'],
                  ] as [GroupBy, string][]
                ).map(([g, label]) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroupBy(g)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                      groupBy === g ? 'bg-olive text-white' : 'text-softgray'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 w-full mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedBreakdown} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDDCD4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#858780', fontSize: 11 }} axisLine={{ stroke: '#DDDCD4' }} tickLine={false} />
                  <YAxis tick={{ fill: '#858780', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(v: number) => formatCurrencyExact(v, state.language)}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #DDDCD4', fontSize: '12px' }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#424D40"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => data?.key && handleSegmentFilter(String(data.key))}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-porcelain border-b border-hairline text-[11px] uppercase tracking-wider text-softgray">
                    <th className="py-2.5 px-3">{groupBy}</th>
                    <th className="py-2.5 px-3 text-right">Txns</th>
                    <th className="py-2.5 px-3 text-right">{t('method_cash')}</th>
                    <th className="py-2.5 px-3 text-right">Digital</th>
                    <th className="py-2.5 px-3 text-right">{t('deposit')}</th>
                    <th className="py-2.5 px-3 text-right">Weekly</th>
                    <th className="py-2.5 px-3 text-right">{t('total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {groupedBreakdown.map((g) => (
                    <tr
                      key={g.key}
                      onClick={() => handleSegmentFilter(g.key)}
                      className="hover:bg-porcelain cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-semibold text-charcoal">{g.label}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-softgray">{g.count}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyExact(g.cash, state.language)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyExact(g.digital, state.language)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyExact(g.deposits, state.language)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyExact(g.weekly, state.language)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-charcoal tabular-nums">
                        {formatCurrencyExact(g.total, state.language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Student Balances */}
      {tab === 'balances' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-hairline flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-charcoal">
              {state.language === 'es' ? 'Saldos y Atrasos de Alumnas' : 'Student Balances & Behind-Schedule Ledger'}
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => exportStudentBalancesReport('csv')}>
                CSV
              </Button>
              <Button size="sm" onClick={() => exportStudentBalancesReport('pdf')}>
                PDF
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-porcelain border-b border-hairline text-[11px] uppercase tracking-wider text-softgray">
                  <th className="py-3 px-4">{state.language === 'es' ? 'Alumna' : 'Student'}</th>
                  <th className="py-3 px-4">{state.language === 'es' ? 'Clase' : 'Class'}</th>
                  <th className="py-3 px-4 text-right">{t('courseTotal')}</th>
                  <th className="py-3 px-4 text-right">{t('totalPaid')}</th>
                  <th className="py-3 px-4 text-right">{t('remainingBalance')}</th>
                  <th className="py-3 px-4 text-right">{t('dueToDate')}</th>
                  <th className="py-3 px-4 text-right">{t('behindSchedule')}</th>
                  <th className="py-3 px-4 text-center">{state.language === 'es' ? 'Faltas' : 'Missed'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {studentBalances.map(({ stu, cls, fin, missedCount }) => (
                  <tr
                    key={stu.id}
                    onClick={() => navigate(`/app/students?studentId=${stu.id}`)}
                    className="hover:bg-porcelain/70 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-semibold text-charcoal">{stu.fullName}</td>
                    <td className="py-3 px-4 text-xs text-softgray">{cls?.name}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatCurrencyExact(fin.courseTotal, state.language)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-status-green font-medium">{formatCurrencyExact(fin.totalPaid, state.language)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-charcoal">{formatCurrencyExact(fin.remainingBalance, state.language)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-softgray">{formatCurrencyExact(fin.dueToDate, state.language)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {fin.behindSchedule > 0 ? (
                        <Badge tone="terracotta">
                          {formatCurrencyExact(fin.behindSchedule, state.language)}
                        </Badge>
                      ) : (
                        <Badge tone="sage">$0.00</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {missedCount > 0 ? <Badge tone="amber">{missedCount}</Badge> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Cash Reconciliation */}
      {tab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <KpiCard label="Expected Ledger Cash" value={formatCurrencyExact(reconciliationSummary.expectedAllCash, state.language)} />
            <KpiCard label="Submitted Handoff Cash" value={formatCurrencyExact(reconciliationSummary.submittedCash, state.language)} />
            <KpiCard label="Confirmed & Locked Cash" value={formatCurrencyExact(reconciliationSummary.confirmedCash, state.language)} tone="sage" />
            <KpiCard
              label="Total Recorded Variance"
              value={formatCurrencyExact(reconciliationSummary.totalVariance, state.language)}
              tone={reconciliationSummary.totalVariance === 0 ? 'sage' : 'terracotta'}
            />
          </div>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-charcoal">
                {state.language === 'es' ? 'Entregas de Efectivo' : 'Cash Handoff Audit Trail'}
              </h2>
              <Button size="sm" variant="secondary" onClick={() => navigate('/app/cash-handoff')}>
                {state.language === 'es' ? 'Gestionar Entregas' : 'Manage Handoffs'}
              </Button>
            </div>
            <div className="divide-y divide-hairline">
              {state.cashHandoffs.map((h) => (
                <div
                  key={h.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-charcoal">
                      {h.collectorName} · {h.date}
                    </div>
                    <div className="text-softgray">
                      Expected: {formatCurrencyExact(h.expectedCash, state.language)} · Received:{' '}
                      {h.receivedCash !== undefined
                        ? formatCurrencyExact(h.receivedCash, state.language)
                        : 'Pending'}{' '}
                      · Overall: {formatCurrencyExact(h.overallTotal, state.language)}
                    </div>
                  </div>
                  <Badge
                    tone={
                      h.status === 'confirmed'
                        ? 'sage'
                        : h.status === 'flagged'
                          ? 'terracotta'
                          : 'amber'
                    }
                  >
                    {h.status === 'confirmed' ? (
                      <>
                        <Lock className="w-3 h-3" /> Confirmed
                      </>
                    ) : h.status === 'flagged' ? (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Flagged
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Pending
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Reporting Center (All PRD Section 25.1 Reports) */}
      {tab === 'reporting' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: state.language === 'es' ? 'Reporte de Cobranza' : 'Collections Report',
              desc: 'By day, class, payment type, collector, deposits vs. weekly payments, and cash total.',
              onPdf: () => exportCollectionsReport('pdf'),
              onCsv: () => exportCollectionsReport('csv'),
            },
            {
              title: state.language === 'es' ? 'Saldos de Alumnas' : 'Student Balances Report',
              desc: 'Course total, amount paid, due to date, behind-schedule amount, and missed classes.',
              onPdf: () => exportStudentBalancesReport('pdf'),
              onCsv: () => exportStudentBalancesReport('csv'),
            },
            {
              title: state.language === 'es' ? 'Corte de Caja Diario' : 'Daily Cash Report',
              desc: 'Single-collector, single-day printable sheet with payment breakdown & signature lines.',
              onPdf: () => navigate('/app/daily-cash-report'),
              onCsv: () => navigate('/app/daily-cash-report'),
              openLink: true,
            },
            {
              title: state.language === 'es' ? 'Reporte de Asistencia' : 'Attendance Report',
              desc: 'Present, absent, excused, and cancelled logs per class/week plus open makeups.',
              onPdf: () => exportAttendanceReport('pdf'),
              onCsv: () => exportAttendanceReport('csv'),
            },
            {
              title: state.language === 'es' ? 'Reporte de Inscripciones' : 'Enrollments Report',
              desc: 'Enrollment counts, contract value, enrolled by, lead source, and program.',
              onPdf: () => exportEnrollmentsReport('pdf'),
              onCsv: () => exportEnrollmentsReport('csv'),
            },
            {
              title: state.language === 'es' ? 'Reporte de Visitas' : 'Tours Report',
              desc: 'Booked tours, show rate, enrollment conversion rate, and no-shows.',
              onPdf: () => exportToursReport('pdf'),
              onCsv: () => exportToursReport('csv'),
            },
            {
              title: state.language === 'es' ? 'Reporte de Inventario' : 'Inventory Valuation Report',
              desc: 'Order-now list, category investment values, China & Legacy Nails lead-time flags.',
              onPdf: () => exportInventoryReport('pdf'),
              onCsv: () => exportInventoryReport('csv'),
            },
          ].map((rep) => (
            <Card key={rep.title} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-semibold text-charcoal text-sm">{rep.title}</h3>
                <p className="text-xs text-softgray mt-1.5 leading-relaxed">{rep.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {rep.openLink ? (
                  <Button size="sm" onClick={rep.onPdf}>
                    {state.language === 'es' ? 'Abrir Corte Diario' : 'Open Daily Cash Sheet'}
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={rep.onPdf}>
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </Button>
                    <Button size="sm" variant="secondary" onClick={rep.onCsv}>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      CSV
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
