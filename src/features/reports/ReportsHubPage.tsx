import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useApp } from '../../services/store';
import {
  formatCurrencyExact,
  getStudentFinancialSummary,
  summarizePaymentsByMethod,
} from '../../calculations/paymentEngine';
import { exportToCsv, generateTableReportPdf } from '../../services/pdfExport';
import { Button, PageHeader } from '../../components/ui/Primitives';
import { DailyCashReportPage } from './DailyCashReportPage';

type DatePreset = 'all' | 'this_week' | 'last_week' | 'this_month' | 'custom';

export const ReportsHubPage: React.FC = () => {
  const { state, currentUser, pushToast, t } = useApp();
  const isOwner = currentUser?.role === 'owner';

  const [activeTab, setActiveTab] = useState<'daily_cash' | 'academy_reports'>(
    isOwner ? 'academy_reports' : 'daily_cash'
  );
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customStart, setCustomStart] = useState('2026-10-01');
  const [customEnd, setCustomEnd] = useState('2026-11-30');
  const [classFilter, setClassFilter] = useState('all');

  const dateRange = useMemo(() => {
    if (datePreset === 'this_week') return { start: '2026-11-18', end: '2026-11-24' };
    if (datePreset === 'last_week') return { start: '2026-11-11', end: '2026-11-17' };
    if (datePreset === 'this_month') return { start: '2026-11-01', end: '2026-11-30' };
    if (datePreset === 'custom') return { start: customStart, end: customEnd };
    return { start: '2026-01-01', end: '2026-12-31' };
  }, [datePreset, customStart, customEnd]);

  const scopedPayments = useMemo(
    () =>
      state.payments.filter(
        (p) =>
          p.status === 'confirmed' &&
          p.date >= dateRange.start &&
          p.date <= dateRange.end &&
          (classFilter === 'all' ? true : p.classId === classFilter)
      ),
    [state.payments, dateRange, classFilter]
  );

  const scopedStudents = useMemo(
    () =>
      state.students.filter((s) =>
        classFilter === 'all' ? true : s.classId === classFilter
      ),
    [state.students, classFilter]
  );

  const runExport = (
    reportKey: 'collections' | 'balances' | 'attendance' | 'enrollments' | 'tours' | 'inventory',
    fmt: 'pdf' | 'csv'
  ) => {
    const labelRange = `${dateRange.start} – ${dateRange.end}`;

    if (reportKey === 'collections') {
      const sum = summarizePaymentsByMethod(scopedPayments);
      const headers = ['Receipt #', 'Date', 'Student', 'Class', 'Category', 'Method', 'Collector', 'Amount'];
      const rows = scopedPayments.map((p) => [
        p.receiptNumber,
        p.date,
        state.students.find((s) => s.id === p.studentId)?.fullName ?? p.studentId,
        state.classes.find((c) => c.id === p.classId)?.name ?? p.classId,
        p.category,
        p.method,
        p.collectorName,
        p.amount.toFixed(2),
      ]);
      if (fmt === 'csv') exportToCsv(headers, rows, 'LVB_Collections_Report.csv');
      else
        generateTableReportPdf({
          title: state.language === 'es' ? 'Reporte de Cobranza' : 'Collections Report',
          dateRangeLabel: labelRange,
          filterSummary: `Class: ${classFilter}`,
          headers,
          rows,
          totalsLine: `Total: ${formatCurrencyExact(sum.overallTotal, state.language)} | Cash: ${formatCurrencyExact(sum.cashTotal, state.language)} | Deposits: ${formatCurrencyExact(sum.depositTotal, state.language)}`,
          filename: 'LVB_Collections_Report',
          language: state.language,
        });
    } else if (reportKey === 'balances') {
      const headers = ['Student', 'Class', 'Total', 'Paid', 'Due to Date', 'Remaining', 'Behind', 'Missed'];
      const rows = scopedStudents.map((stu) => {
        const cls = state.classes.find((c) => c.id === stu.classId);
        const fin = getStudentFinancialSummary(stu, cls, state.payments, state.deposits);
        const missed = state.missedClasses.filter(
          (m) => m.studentId === stu.id && m.makeupStatus !== 'cleared'
        ).length;
        return [
          stu.fullName,
          cls?.name ?? '',
          fin.courseTotal.toFixed(2),
          fin.totalPaid.toFixed(2),
          fin.dueToDate.toFixed(2),
          fin.remainingBalance.toFixed(2),
          fin.behindSchedule.toFixed(2),
          missed,
        ];
      });
      if (fmt === 'csv') exportToCsv(headers, rows, 'LVB_Student_Balances.csv');
      else
        generateTableReportPdf({
          title: state.language === 'es' ? 'Reporte de Saldos de Alumnas' : 'Student Balances Report',
          dateRangeLabel: labelRange,
          filterSummary: `Class: ${classFilter}`,
          headers,
          rows,
          filename: 'LVB_Student_Balances',
          language: state.language,
        });
    } else if (reportKey === 'attendance') {
      const att = state.attendance.filter(
        (a) =>
          a.date >= dateRange.start &&
          a.date <= dateRange.end &&
          (classFilter === 'all' ? true : a.classId === classFilter)
      );
      const headers = ['Student', 'Class', 'Week', 'Date', 'Status', 'Notes'];
      const rows = att.map((a) => [
        state.students.find((s) => s.id === a.studentId)?.fullName ?? a.studentId,
        state.classes.find((c) => c.id === a.classId)?.name ?? a.classId,
        `W${a.week}`,
        a.date,
        a.status,
        a.notes,
      ]);
      if (fmt === 'csv') exportToCsv(headers, rows, 'LVB_Attendance_Report.csv');
      else
        generateTableReportPdf({
          title: state.language === 'es' ? 'Reporte de Asistencia' : 'Attendance & Makeup Report',
          dateRangeLabel: labelRange,
          filterSummary: `Class: ${classFilter}`,
          headers,
          rows,
          filename: 'LVB_Attendance_Report',
          language: state.language,
        });
    } else if (reportKey === 'enrollments') {
      const headers = ['Student', 'Program', 'Date', 'Contract Value', 'Source', 'Enrolled By', 'Status'];
      const rows = scopedStudents.map((s) => [
        s.fullName,
        s.program,
        s.enrollmentDate,
        s.courseTotal.toFixed(2),
        s.source,
        s.enrolledByName,
        s.enrollmentStatus,
      ]);
      if (fmt === 'csv') exportToCsv(headers, rows, 'LVB_Enrollments_Report.csv');
      else
        generateTableReportPdf({
          title: state.language === 'es' ? 'Reporte de Inscripciones' : 'Enrollment Report',
          dateRangeLabel: labelRange,
          filterSummary: `Class: ${classFilter}`,
          headers,
          rows,
          filename: 'LVB_Enrollments_Report',
          language: state.language,
        });
    } else if (reportKey === 'tours') {
      const tours = state.tours.filter(
        (tr) => tr.date >= dateRange.start && tr.date <= dateRange.end
      );
      const headers = ['Visitor', 'Date', 'Time', 'Program', 'Assigned', 'Outcome'];
      const rows = tours.map((tr) => [
        tr.visitorName,
        tr.date,
        tr.time,
        tr.programInterest,
        tr.assignedStaffName,
        tr.outcome,
      ]);
      if (fmt === 'csv') exportToCsv(headers, rows, 'LVB_Studio_Tours_Report.csv');
      else
        generateTableReportPdf({
          title: state.language === 'es' ? 'Reporte de Visitas al Estudio' : 'Studio Tours Report',
          dateRangeLabel: labelRange,
          filterSummary: `Tours: ${tours.length}`,
          headers,
          rows,
          filename: 'LVB_Studio_Tours_Report',
          language: state.language,
        });
    } else {
      const headers = ['SKU', 'Product', 'Section', 'Qty', 'Status', 'Unit Cost', 'Value', 'Lead Time'];
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
      if (fmt === 'csv') exportToCsv(headers, rows, 'LVB_Inventory_Report.csv');
      else
        generateTableReportPdf({
          title: state.language === 'es' ? 'Reporte de Inventario' : 'Inventory Valuation Report',
          dateRangeLabel: 'As of 2026-11-24',
          filterSummary: '101 Products · 5 Sections',
          headers,
          rows,
          filename: 'LVB_Inventory_Report',
          language: state.language,
        });
    }

    pushToast(t('toastExportSuccess'));
  };

  if (!isOwner) {
    return <DailyCashReportPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_reports')}
        phase={t('navGroupFinance')}
        subtitle={
          state.language === 'es'
            ? 'Reportes de cobranza, saldos, asistencia, inscripciones, visitas, inventario y cortes diarios con exportación real PDF y CSV.'
            : 'Academy-wide PDF and CSV reports plus printable Daily Cash Reports driven directly by shared operational records.'
        }
        actions={
          <div className="inline-flex bg-white border border-hairline rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('academy_reports')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                activeTab === 'academy_reports' ? 'bg-olive text-white' : 'text-softgray'
              }`}
            >
              {state.language === 'es' ? 'Reportes de Academia' : 'Academy Reports'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily_cash')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                activeTab === 'daily_cash' ? 'bg-olive text-white' : 'text-softgray'
              }`}
            >
              {t('nav_dailyCash')}
            </button>
          </div>
        }
      />

      {activeTab === 'daily_cash' ? (
        <DailyCashReportPage />
      ) : (
        <div className="space-y-5">
          {/* Shared Report Filter Strip */}
          <div className="bg-white border border-hairline rounded-atelier p-4 flex flex-wrap items-center gap-2">
            {(
              [
                ['this_week', t('periodThisWeek')],
                ['last_week', t('periodLastWeek')],
                ['this_month', t('periodThisMonth')],
                ['all', t('all')],
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
              <div className="flex items-center gap-1.5 bg-porcelain border border-hairline rounded-lg px-2.5 py-1 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent"
                />
                <span>–</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent"
                />
              </div>
            )}

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-hairline bg-porcelain text-charcoal ml-auto"
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
          </div>

          {/* Hairline-divided Reports Directory */}
          <div className="bg-white border border-hairline rounded-atelier divide-y divide-hairline overflow-hidden">
            {(
              [
                {
                  key: 'collections',
                  title: state.language === 'es' ? 'Reporte de Cobranza' : 'Collections Report',
                  desc: 'By day, week, month, class, payment type, collector, deposits vs. weekly payments, and cash total.',
                  meta: `${scopedPayments.length} matching records`,
                },
                {
                  key: 'balances',
                  title: state.language === 'es' ? 'Saldos de Alumnas' : 'Student Balances Report',
                  desc: 'Course total, total paid, due to date, remaining balance, behind-schedule arrears, and open missed classes.',
                  meta: `${scopedStudents.length} students`,
                },
                {
                  key: 'attendance',
                  title: state.language === 'es' ? 'Reporte de Asistencia' : 'Attendance Report',
                  desc: 'Present, absent, excused, and cancelled sessions with follow-up list and open makeups.',
                  meta: `${state.missedClasses.filter((m) => m.makeupStatus !== 'cleared').length} open makeups`,
                },
                {
                  key: 'enrollments',
                  title: state.language === 'es' ? 'Reporte de Inscripciones' : 'Enrollment Report',
                  desc: 'Enrollment counts, contract value, lead source, program, and person responsible.',
                  meta: `${scopedStudents.length} contracts`,
                },
                {
                  key: 'tours',
                  title: state.language === 'es' ? 'Reporte de Visitas al Estudio' : 'Studio Tours Report',
                  desc: 'Booked tours, show rate, enrollment conversion rate, and no-shows.',
                  meta: `${state.tours.length} tours`,
                },
                {
                  key: 'inventory',
                  title: state.language === 'es' ? 'Inventario y Valuación' : 'Inventory & Lead-Time Report',
                  desc: 'All 101 products, Order Now items, section values, and China / Legacy Nails lead-time warnings.',
                  meta: '101 products · 5 sections',
                },
              ] as const
            ).map((rep) => (
              <div
                key={rep.key}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-porcelain/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-olive" />
                    <h3 className="font-semibold text-charcoal text-sm">{rep.title}</h3>
                    <span className="text-xs text-clay-dark font-medium">· {rep.meta}</span>
                  </div>
                  <p className="text-xs text-softgray max-w-2xl">{rep.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => runExport(rep.key, 'csv')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    CSV
                  </Button>
                  <Button size="sm" onClick={() => runExport(rep.key, 'pdf')}>
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
