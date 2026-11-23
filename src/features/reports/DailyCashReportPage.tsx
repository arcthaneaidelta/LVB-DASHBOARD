import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Printer, Send, Lock, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../../services/store';
import {
  formatCurrencyExact,
  summarizePaymentsByMethod,
} from '../../calculations/paymentEngine';
import { generateDailyCashReportPdf } from '../../services/pdfExport';
import { Badge, Button, Card, PageHeader } from '../../components/ui/Primitives';
import type { TranslationKey } from '../../translations/dictionary';

export const DailyCashReportPage: React.FC = () => {
  const { state, currentUser, submitCashHandoff, t } = useApp();
  const navigate = useNavigate();

  const isOwner = currentUser?.role === 'owner';
  const collectors = useMemo(
    () =>
      state.users.filter(
        (u) => u.role === 'instructor' || u.role === 'owner' || u.role === 'telemarketing'
      ),
    [state.users]
  );

  const [collectorId, setCollectorId] = useState(
    isOwner ? 'user-marisol' : currentUser?.id ?? 'user-marisol'
  );
  const [reportDate, setReportDate] = useState('2026-11-24');

  const activeCollectorId = isOwner ? collectorId : currentUser?.id ?? collectorId;
  const collectorUser = state.users.find((u) => u.id === activeCollectorId);

  const dayPayments = useMemo(() => {
    return state.payments
      .filter(
        (p) =>
          p.status === 'confirmed' &&
          p.collectorId === activeCollectorId &&
          p.date === reportDate
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [state.payments, activeCollectorId, reportDate]);

  const summary = useMemo(() => summarizePaymentsByMethod(dayPayments), [dayPayments]);
  const hasUnsubmitted = dayPayments.some((p) => !p.cashHandoffId);

  // Quick date presets that have real seeded payments for convenient demo exploration
  const availableDates = useMemo(() => {
    const set = new Set(
      state.payments
        .filter((p) => p.collectorId === activeCollectorId && p.status === 'confirmed')
        .map((p) => p.date)
    );
    return Array.from(set).sort().reverse().slice(0, 5);
  }, [state.payments, activeCollectorId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_dailyCash')}
        phase={t('phase1')}
        subtitle={
          state.language === 'es'
            ? 'Corte oficial de un cobrador por un día, derivado directamente de los pagos registrados.'
            : 'Single-collector, single-day cash accountability sheet derived directly from recorded payments.'
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              {t('print')}
            </Button>
            <Button
              variant="champagne"
              onClick={() =>
                generateDailyCashReportPdf({
                  collectorName: collectorUser?.name ?? 'Collector',
                  date: reportDate,
                  payments: dayPayments,
                  students: state.students,
                  classes: state.classes,
                  language: state.language,
                })
              }
            >
              <Download className="w-4 h-4" />
              {t('exportPdf')}
            </Button>
            {hasUnsubmitted && (
              <Button
                onClick={() => {
                  const res = submitCashHandoff(reportDate, activeCollectorId);
                  if (res.ok) navigate('/app/cash-handoff');
                }}
              >
                <Send className="w-4 h-4" />
                {state.language === 'es' ? 'Enviar Entrega' : 'Submit Handoff'}
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Controls */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-3">
          {isOwner ? (
            <label className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slatewarm">{t('collector')}:</span>
              <select
                value={activeCollectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                className="h-9 px-3 rounded-lg border border-borderwarm bg-porcelain text-navy font-medium"
              >
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({t(`role_${c.role}` as TranslationKey)})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <Badge tone="navy">{collectorUser?.name}</Badge>
          )}

          <label className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slatewarm">{t('date')}:</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-borderwarm bg-porcelain text-navy font-medium"
            />
          </label>
        </div>

        {availableDates.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slatewarm">
              {state.language === 'es' ? 'Fechas con cobros:' : 'Recent dates:'}
            </span>
            {availableDates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setReportDate(d)}
                className={`px-2 py-1 rounded-md border tabular-nums transition-colors ${
                  reportDate === d
                    ? 'bg-navy text-white border-navy'
                    : 'bg-porcelain text-navy border-borderwarm hover:border-champagne'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Printable Official Daily Cash Sheet */}
      <Card className="overflow-hidden">
        {/* Sheet Header */}
        <div className="bg-navy text-white px-6 py-5 border-b-2 border-champagne flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="font-editorial text-2xl">
              {state.language === 'es' ? 'Corte de Caja Diario' : 'Daily Cash Collection Report'}
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-champagne-soft mt-1">
              La Voute Beauty Academy LLC · City Terrace, Los Angeles
            </div>
          </div>
          <div className="text-xs sm:text-right space-y-0.5">
            <div>
              <span className="text-white/65">{t('collector')}: </span>
              <span className="font-semibold">{collectorUser?.name}</span>
            </div>
            <div>
              <span className="text-white/65">{t('date')}: </span>
              <span className="font-semibold tabular-nums">{reportDate}</span>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="p-5">
          {dayPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-slatewarm flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-champagne" />
              <span>
                {state.language === 'es'
                  ? 'No hay pagos registrados para este cobrador en la fecha seleccionada.'
                  : 'No payments recorded for this collector on the selected date.'}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-porcelain border-b border-borderwarm text-[11px] uppercase tracking-wider text-slatewarm">
                    <th className="py-2.5 px-3">{t('receiptNumber')}</th>
                    <th className="py-2.5 px-3">{state.language === 'es' ? 'Alumna' : 'Student'}</th>
                    <th className="py-2.5 px-3">{state.language === 'es' ? 'Clase' : 'Class'}</th>
                    <th className="py-2.5 px-3">{state.language === 'es' ? 'Sem.' : 'Wk'}</th>
                    <th className="py-2.5 px-3">{t('paymentMethod')}</th>
                    <th className="py-2.5 px-3">{state.language === 'es' ? 'Hora' : 'Time'}</th>
                    <th className="py-2.5 px-3 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderwarm">
                  {dayPayments.map((p) => {
                    const stu = state.students.find((s) => s.id === p.studentId);
                    const cls = state.classes.find((c) => c.id === p.classId);
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold text-navy">
                          <span className="inline-flex items-center gap-1">
                            {p.receiptNumber}
                            {p.locked && <Lock className="w-3 h-3 text-champagne" />}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-navy">{stu?.fullName}</td>
                        <td className="py-2.5 px-3 text-slatewarm">{cls?.name}</td>
                        <td className="py-2.5 px-3 text-navy">
                          {p.week === 0 ? t('deposit') : `W${p.week}`}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge tone={p.method === 'cash' ? 'champagne' : 'slate'}>
                            {t(`method_${p.method}` as TranslationKey)}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slatewarm tabular-nums">
                          {p.createdAt.slice(11, 16)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-navy tabular-nums">
                          {formatCurrencyExact(p.amount, state.language)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-borderwarm">
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-navy uppercase tracking-wider mb-2">
                {state.language === 'es' ? 'Totales por Método' : 'Totals by Payment Type'}
              </div>
              {(['cash', 'card', 'zelle', 'venmo', 'cash_app', 'check', 'other'] as const)
                .filter((m) => summary.byMethod[m] > 0 || m === 'cash')
                .map((m) => (
                  <div key={m} className="flex justify-between py-1 border-b border-borderwarm/60">
                    <span className="text-slatewarm">{t(`method_${m}` as TranslationKey)}</span>
                    <span className="font-semibold text-navy tabular-nums">
                      {formatCurrencyExact(summary.byMethod[m], state.language)}
                    </span>
                  </div>
                ))}
            </div>

            <div className="p-4 rounded-xl bg-porcelain border border-champagne/40 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-champagne">
                  {state.language === 'es'
                    ? 'Total de Efectivo a Entregar'
                    : 'Total Cash to Hand In'}
                </div>
                <div className="font-editorial text-3xl text-navy tabular-nums mt-1">
                  {formatCurrencyExact(summary.cashTotal, state.language)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-borderwarm flex justify-between text-xs">
                <span className="text-slatewarm">
                  {state.language === 'es' ? 'Total General Recaudado' : 'Overall Collected Today'}
                </span>
                <span className="font-semibold text-navy tabular-nums">
                  {formatCurrencyExact(summary.overallTotal, state.language)} ({summary.count})
                </span>
              </div>
            </div>
          </div>

          {/* Signature Lines */}
          <div className="mt-10 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs text-slatewarm">
            <div>
              <div className="border-b border-navy/50 h-8" />
              <div className="mt-1.5 font-medium text-navy">
                {state.language === 'es' ? 'Preparado por' : 'Prepared by'}
              </div>
              <div>{collectorUser?.name}</div>
            </div>
            <div>
              <div className="border-b border-navy/50 h-8" />
              <div className="mt-1.5 font-medium text-navy">
                {state.language === 'es' ? 'Recibido por (Propietario)' : 'Received by (Owner)'}
              </div>
              <div>Rudy Figueroa / Sidney Figueroa</div>
            </div>
            <div>
              <div className="border-b border-navy/50 h-8" />
              <div className="mt-1.5 font-medium text-navy">{t('date')}</div>
              <div className="tabular-nums">{reportDate}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
