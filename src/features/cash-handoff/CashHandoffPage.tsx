import React, { useMemo, useState } from 'react';
import {
  Banknote,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../services/store';
import { canConfirmCashHandoff } from '../../permissions/permissions';
import {
  formatCurrencyExact,
  roundCurrency,
  summarizePaymentsByMethod,
} from '../../calculations/paymentEngine';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { CashHandoff } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

export const CashHandoffPage: React.FC = () => {
  const { state, currentUser, submitCashHandoff, confirmCashHandoff, flagCashHandoff, t } =
    useApp();

  const isOwner = currentUser ? canConfirmCashHandoff(currentUser) : false;
  const [selectedDate, setSelectedDate] = useState('2026-11-24');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Owner review modal state
  const [reviewHandoff, setReviewHandoff] = useState<CashHandoff | null>(null);
  const [receivedInput, setReceivedInput] = useState('');
  const [flagNote, setFlagNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Unsubmitted payments for current user on selectedDate
  const unsubmittedToday = useMemo(() => {
    if (!currentUser) return [];
    return state.payments.filter(
      (p) =>
        p.status === 'confirmed' &&
        p.collectorId === currentUser.id &&
        p.date === selectedDate &&
        !p.cashHandoffId
    );
  }, [state.payments, currentUser, selectedDate]);

  const unsubmittedSummary = useMemo(
    () => summarizePaymentsByMethod(unsubmittedToday),
    [unsubmittedToday]
  );

  // Visible handoffs (Owner sees all; Instructor sees own only)
  const visibleHandoffs = useMemo(() => {
    if (!currentUser) return [];
    return state.cashHandoffs
      .filter((h) => isOwner || h.collectorId === currentUser.id)
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return b.date.localeCompare(a.date);
      });
  }, [state.cashHandoffs, currentUser, isOwner]);

  const openOwnerReview = (h: CashHandoff) => {
    setReviewHandoff(h);
    setReceivedInput(String(h.receivedCash ?? h.expectedCash));
    setFlagNote(h.flagNote ?? '');
    setReviewError('');
  };

  const liveVariance = useMemo(() => {
    if (!reviewHandoff) return 0;
    const val = Number(receivedInput);
    if (!Number.isFinite(val)) return 0;
    return roundCurrency(val - reviewHandoff.expectedCash);
  }, [reviewHandoff, receivedInput]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_cashHandoff')}
        phase={t('phase1')}
        subtitle={
          isOwner
            ? state.language === 'es'
              ? 'Revisa las entregas enviadas por las instructoras, verifica el efectivo recibido y bloquea los registros confirmados.'
              : 'Review instructor submissions, verify physical cash received, and lock confirmed cash entries.'
            : state.language === 'es'
              ? 'Revisa tu cobranza del día y envía el sobre de efectivo para confirmación del propietario.'
              : 'Review your daily collected payments and submit your cash handoff for owner confirmation.'
        }
      />

      {/* Submit Today's Handoff Panel (Instructors & Owners who collected today) */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-navy">
              {state.language === 'es'
                ? 'Cobranza del Día Sin Entregar'
                : 'Unsubmitted Daily Collection'}
            </h2>
            <p className="text-xs text-slatewarm mt-0.5">
              {t('collector')}: <strong className="text-navy">{currentUser?.name}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-borderwarm bg-porcelain text-navy"
              aria-label="Collection date"
            />
            <Button
              size="sm"
              disabled={unsubmittedToday.length === 0}
              onClick={() => setSubmitModalOpen(true)}
            >
              <Send className="w-3.5 h-3.5" />
              {state.language === 'es' ? 'Enviar Entrega de Efectivo' : 'Submit Cash Handoff'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-porcelain border border-borderwarm">
            <div className="text-slatewarm">{state.language === 'es' ? 'Transacciones' : 'Transactions'}</div>
            <div className="text-lg font-semibold text-navy tabular-nums mt-0.5">
              {unsubmittedSummary.count}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-champagne-light/70 border border-champagne/40">
            <div className="text-slatewarm">{state.language === 'es' ? 'Efectivo Total' : 'Cash Total'}</div>
            <div className="text-lg font-semibold text-navy tabular-nums mt-0.5">
              {formatCurrencyExact(unsubmittedSummary.cashTotal, state.language)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-porcelain border border-borderwarm">
            <div className="text-slatewarm">{t('method_card')}</div>
            <div className="text-lg font-semibold text-navy tabular-nums mt-0.5">
              {formatCurrencyExact(unsubmittedSummary.cardTotal, state.language)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-porcelain border border-borderwarm">
            <div className="text-slatewarm">{state.language === 'es' ? 'Digital (Zelle/etc)' : 'Digital Totals'}</div>
            <div className="text-lg font-semibold text-navy tabular-nums mt-0.5">
              {formatCurrencyExact(unsubmittedSummary.digitalTotal, state.language)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-navy text-white col-span-2 sm:col-span-1">
            <div className="text-white/70">{state.language === 'es' ? 'Total General' : 'Overall Total'}</div>
            <div className="text-lg font-semibold tabular-nums mt-0.5">
              {formatCurrencyExact(unsubmittedSummary.overallTotal, state.language)}
            </div>
          </div>
        </div>

        {unsubmittedToday.length > 0 && (
          <div className="mt-4 pt-3 border-t border-borderwarm divide-y divide-borderwarm text-xs">
            {unsubmittedToday.map((p) => {
              const stu = state.students.find((s) => s.id === p.studentId);
              return (
                <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold text-navy">{p.receiptNumber}</span> ·{' '}
                    <span className="text-navy">{stu?.fullName}</span> ({t(`method_${p.method}` as TranslationKey)})
                  </div>
                  <span className="font-semibold text-navy tabular-nums">
                    {formatCurrencyExact(p.amount, state.language)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Handoffs History & Owner Review Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy">
            {isOwner
              ? state.language === 'es'
                ? 'Cola de Confirmación e Historial'
                : 'Owner Confirmation Queue & History'
              : state.language === 'es'
                ? 'Mis Entregas Enviadas'
                : 'My Submitted Cash Handoffs'}
          </h2>
          <span className="text-xs text-slatewarm inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-champagne" />
            {state.language === 'es'
              ? 'Los registros confirmados quedan bloqueados'
              : 'Confirmed entries become locked'}
          </span>
        </div>

        {visibleHandoffs.length === 0 ? (
          <EmptyState
            icon={<Banknote className="w-5 h-5" />}
            title={t('noResults')}
            description={t('noResultsHint')}
          />
        ) : (
          visibleHandoffs.map((h) => {
            const linkedPayments = state.payments.filter((p) =>
              h.paymentIds.includes(p.id)
            );
            const isConfirmed = h.status === 'confirmed';
            const isFlagged = h.status === 'flagged';

            return (
              <Card
                key={h.id}
                className={`p-5 ${
                  h.status === 'pending'
                    ? 'border-champagne bg-champagne-light/20'
                    : isFlagged
                      ? 'border-terracotta/50 bg-terracotta-light/25'
                      : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-navy text-sm">
                        {h.collectorName}
                      </span>
                      <span className="text-xs text-slatewarm tabular-nums">{h.date}</span>
                      <Badge
                        tone={
                          isConfirmed ? 'sage' : isFlagged ? 'terracotta' : 'amber'
                        }
                      >
                        {isConfirmed ? (
                          <>
                            <Lock className="w-3 h-3" /> {t('confirmed')} · {t('locked')}
                          </>
                        ) : isFlagged ? (
                          <>
                            <AlertTriangle className="w-3 h-3" /> {t('flagged')}
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> {t('pendingConfirmation')}
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-xs text-slatewarm">
                      <span>
                        {state.language === 'es' ? 'Efectivo esperado:' : 'Expected Cash:'}{' '}
                        <strong className="text-navy tabular-nums">
                          {formatCurrencyExact(h.expectedCash, state.language)}
                        </strong>
                      </span>
                      <span>
                        {t('method_card')}:{' '}
                        <strong className="text-navy tabular-nums">
                          {formatCurrencyExact(h.cardTotal, state.language)}
                        </strong>
                      </span>
                      <span>
                        Digital:{' '}
                        <strong className="text-navy tabular-nums">
                          {formatCurrencyExact(h.digitalTotal, state.language)}
                        </strong>
                      </span>
                      <span>
                        {state.language === 'es' ? 'Total:' : 'Overall:'}{' '}
                        <strong className="text-navy tabular-nums">
                          {formatCurrencyExact(h.overallTotal, state.language)}
                        </strong>{' '}
                        ({h.transactionCount})
                      </span>
                    </div>

                    {isConfirmed && (
                      <div className="text-xs text-sage-dark flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Received {formatCurrencyExact(h.receivedCash ?? h.expectedCash, state.language)} ·
                          Variance {formatCurrencyExact(h.variance ?? 0, state.language)} · Confirmed by{' '}
                          {h.confirmedByName} ({h.confirmedAt?.slice(0, 10)})
                        </span>
                      </div>
                    )}

                    {isFlagged && h.flagNote && (
                      <div className="text-xs text-terracotta-dark bg-terracotta-light/60 px-3 py-1.5 rounded-lg inline-block">
                        Variance {formatCurrencyExact(h.variance ?? 0, state.language)} — {h.flagNote}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && !isConfirmed && (
                      <Button onClick={() => openOwnerReview(h)}>
                        {state.language === 'es' ? 'Revisar y Confirmar' : 'Review & Confirm'}
                      </Button>
                    )}
                    {isConfirmed && (
                      <Badge tone="slate">
                        <Lock className="w-3 h-3" />
                        {linkedPayments.length}{' '}
                        {state.language === 'es' ? 'pagos bloqueados' : 'locked entries'}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Instructor Submit Confirmation Modal */}
      <Modal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title={state.language === 'es' ? 'Confirmar Envío de Entrega' : 'Confirm Cash Handoff Submission'}
      >
        <div className="space-y-4">
          <p className="text-xs text-slatewarm">
            {state.language === 'es'
              ? 'Se enviará el corte del día para revisión y confirmación de Rudy o Sidney.'
              : 'This will create a Pending Owner Confirmation handoff linking all unsubmitted payments for this date.'}
          </p>
          <div className="p-4 rounded-xl bg-porcelain border border-borderwarm space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slatewarm">{t('date')}</span>
              <span className="font-semibold text-navy">{selectedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slatewarm">{t('collector')}</span>
              <span className="font-semibold text-navy">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slatewarm">{state.language === 'es' ? 'Efectivo a entregar' : 'Cash Expected'}</span>
              <span className="font-semibold text-navy tabular-nums">
                {formatCurrencyExact(unsubmittedSummary.cashTotal, state.language)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slatewarm">{state.language === 'es' ? 'Total general' : 'Overall Total'}</span>
              <span className="font-semibold text-navy tabular-nums">
                {formatCurrencyExact(unsubmittedSummary.overallTotal, state.language)}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSubmitModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                submitCashHandoff(selectedDate);
                setSubmitModalOpen(false);
              }}
            >
              {t('confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Owner Review & Lock Modal */}
      <Modal
        open={Boolean(reviewHandoff)}
        onClose={() => setReviewHandoff(null)}
        title={state.language === 'es' ? 'Confirmar Entrega de Efectivo' : 'Verify & Confirm Cash Handoff'}
        subtitle={
          reviewHandoff
            ? `${reviewHandoff.collectorName} · ${reviewHandoff.date} (${reviewHandoff.transactionCount} transactions)`
            : ''
        }
        maxWidth="max-w-xl"
      >
        {reviewHandoff && (() => {
          const linked = state.payments.filter((p) =>
            reviewHandoff.paymentIds.includes(p.id)
          );
          return (
            <div className="space-y-4">
              {reviewError && (
                <div className="p-3 rounded-lg bg-terracotta-light text-terracotta-dark text-xs">
                  {reviewError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-porcelain">
                  <div className="text-slatewarm">Expected Cash</div>
                  <div className="text-base font-semibold text-navy tabular-nums mt-0.5">
                    {formatCurrencyExact(reviewHandoff.expectedCash, state.language)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-porcelain">
                  <div className="text-slatewarm">Card + Digital</div>
                  <div className="text-base font-semibold text-navy tabular-nums mt-0.5">
                    {formatCurrencyExact(
                      roundCurrency(reviewHandoff.cardTotal + reviewHandoff.digitalTotal),
                      state.language
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-porcelain">
                  <div className="text-slatewarm">Variance</div>
                  <div
                    className={`text-base font-semibold tabular-nums mt-0.5 ${
                      liveVariance === 0 ? 'text-sage-dark' : 'text-terracotta-dark'
                    }`}
                  >
                    {liveVariance >= 0 ? '+' : ''}
                    {formatCurrencyExact(liveVariance, state.language)}
                  </div>
                </div>
              </div>

              <label className="block text-sm">
                <span className="text-xs font-medium text-navy">
                  {state.language === 'es'
                    ? 'Efectivo Físico Recibido ($)'
                    : 'Physical Cash Received ($)'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={receivedInput}
                  onChange={(e) => setReceivedInput(e.target.value)}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-borderwarm bg-porcelain text-base font-semibold tabular-nums"
                />
              </label>

              {/* Included transactions breakdown */}
              <div className="max-h-40 overflow-y-auto border border-borderwarm rounded-lg divide-y divide-borderwarm text-xs">
                {linked.map((p) => {
                  const stu = state.students.find((s) => s.id === p.studentId);
                  return (
                    <div key={p.id} className="px-3 py-2 flex items-center justify-between">
                      <span>
                        <strong className="font-mono">{p.receiptNumber}</strong> · {stu?.fullName} (
                        {t(`method_${p.method}` as TranslationKey)})
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrencyExact(p.amount, state.language)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <label className="block text-sm">
                <span className="text-xs font-medium text-navy">
                  {state.language === 'es'
                    ? 'Nota de discrepancia (obligatoria solo si marcas discrepancia)'
                    : 'Discrepancy Note (required if flagging variance)'}
                </span>
                <input
                  type="text"
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="e.g., Missing $10 bill — instructor double-checking studio envelope"
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
                />
              </label>

              <p className="text-[11px] text-slatewarm">
                {state.language === 'es'
                  ? 'Confirmar bloqueará permanentemente estas entradas de efectivo en la demostración.'
                  : 'Confirming permanently locks all associated payment entries against ordinary editing.'}
              </p>

              <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const res = flagCashHandoff(
                      reviewHandoff.id,
                      Number(receivedInput),
                      flagNote
                    );
                    if (!res.ok) {
                      setReviewError(res.error ?? 'Note required to flag discrepancy.');
                      return;
                    }
                    setReviewHandoff(null);
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {state.language === 'es' ? 'Marcar Discrepancia' : 'Flag Discrepancy'}
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setReviewHandoff(null)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      const res = confirmCashHandoff(
                        reviewHandoff.id,
                        Number(receivedInput)
                      );
                      if (!res.ok) {
                        setReviewError(res.error ?? 'Could not confirm.');
                        return;
                      }
                      setReviewHandoff(null);
                    }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {state.language === 'es' ? 'Confirmar y Bloquear' : 'Confirm & Lock Cash'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
