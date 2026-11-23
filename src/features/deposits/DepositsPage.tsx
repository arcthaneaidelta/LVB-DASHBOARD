import React, { useMemo, useState } from 'react';
import { Plus, CheckCircle2, Clock, Eye, Download, Printer } from 'lucide-react';
import { useApp } from '../../services/store';
import {
  canConfirmDeposit,
  canTakeDeposit,
  canViewStudent,
} from '../../permissions/permissions';
import { formatCurrencyExact, roundCurrency } from '../../calculations/paymentEngine';
import { generateReceiptPdf } from '../../services/pdfExport';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { Deposit, PaymentMethod } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

const METHODS: PaymentMethod[] = ['cash', 'card', 'zelle', 'venmo', 'cash_app', 'check', 'other'];

export const DepositsPage: React.FC = () => {
  const { state, currentUser, createDeposit, confirmDeposit, t } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [takeOpen, setTakeOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Deposit | null>(null);
  const [previewDep, setPreviewDep] = useState<Deposit | null>(null);

  const eligibleStudents = useMemo(() => {
    if (!currentUser) return [];
    return state.students.filter((s) => canViewStudent(currentUser, s));
  }, [state.students, currentUser]);

  const [form, setForm] = useState({
    studentId: eligibleStudents[0]?.id ?? 'stu-01',
    amount: '50',
    method: 'cash' as PaymentMethod,
    date: '2026-11-24',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const visibleDeposits = useMemo(() => {
    if (!currentUser) return [];
    return state.deposits
      .filter((d) => currentUser.role === 'owner' || d.collectorId === currentUser.id)
      .filter((d) => (statusFilter === 'all' ? true : d.status === statusFilter))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return b.date.localeCompare(a.date);
      });
  }, [state.deposits, currentUser, statusFilter]);

  const pendingTotal = roundCurrency(
    visibleDeposits.filter((d) => d.status === 'pending').reduce((s, d) => s + d.amount, 0)
  );
  const confirmedTotal = roundCurrency(
    visibleDeposits.filter((d) => d.status === 'confirmed').reduce((s, d) => s + d.amount, 0)
  );

  const handleTakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = state.students.find((s) => s.id === form.studentId);
    if (!stu) {
      setFormError('Select a valid student.');
      return;
    }
    const res = createDeposit({
      studentId: stu.id,
      classId: stu.classId,
      amount: Number(form.amount),
      method: form.method,
      date: form.date,
      notes: form.notes,
    });
    if (!res.ok) {
      setFormError(res.error ?? 'Could not save deposit.');
      return;
    }
    setFormError('');
    setTakeOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_deposits')}
        phase={t('navGroupFinance')}
        subtitle={
          state.language === 'es'
            ? 'Los depósitos permanecen Pendientes hasta que un Propietario los confirme; al confirmarse se actualiza el saldo y la lista de inscripción.'
            : 'Deposits remain Pending until confirmed by an Owner — updating student balances and enrollment checklist step 1 automatically.'
        }
        actions={
          currentUser &&
          canTakeDeposit(currentUser) && (
            <Button onClick={() => setTakeOpen(true)}>
              <Plus className="w-4 h-4" />
              {state.language === 'es' ? 'Tomar Depósito' : 'Record Deposit'}
            </Button>
          )
        }
      />

      {/* Architectural Summary Bar */}
      <div className="bg-white border border-hairline rounded-atelier grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-softgray">
            {t('pendingConfirmation')}
          </div>
          <div className="font-editorial text-3xl text-status-amber tabular-nums mt-1">
            {formatCurrencyExact(pendingTotal, state.language)}
          </div>
          <div className="text-xs text-softgray mt-0.5">
            {visibleDeposits.filter((d) => d.status === 'pending').length}{' '}
            {state.language === 'es' ? 'pendientes' : 'awaiting owner review'}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-softgray">
            {t('confirmed')}
          </div>
          <div className="font-editorial text-3xl text-status-green tabular-nums mt-1">
            {formatCurrencyExact(confirmedTotal, state.language)}
          </div>
          <div className="text-xs text-softgray mt-0.5">
            {visibleDeposits.filter((d) => d.status === 'confirmed').length}{' '}
            {state.language === 'es' ? 'confirmados en libro' : 'posted to ledger'}
          </div>
        </div>
        <div className="p-4 sm:p-5 flex items-center justify-between gap-2">
          <div className="inline-flex bg-porcelain border border-hairline rounded-lg p-0.5">
            {(['all', 'pending', 'confirmed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === st ? 'bg-olive text-white' : 'text-softgray hover:text-charcoal'
                }`}
              >
                {st === 'all' ? t('all') : st === 'pending' ? t('pendingConfirmation') : t('confirmed')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleDeposits.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
        />
      ) : (
        <div className="bg-white border border-hairline rounded-atelier divide-y divide-hairline overflow-hidden">
          {visibleDeposits.map((dep) => {
            const stu = state.students.find((s) => s.id === dep.studentId);
            const cls = state.classes.find((c) => c.id === dep.classId);
            const isPending = dep.status === 'pending';

            return (
              <div
                key={dep.id}
                className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPending ? 'bg-status-amberBg/30' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-charcoal">
                      {dep.receiptNumber}
                    </span>
                    <Badge tone={isPending ? 'amber' : 'green'}>
                      {isPending ? (
                        <>
                          <Clock className="w-3 h-3" /> {t('pendingConfirmation')}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> {t('confirmed')}
                        </>
                      )}
                    </Badge>
                    <Badge tone="gray">{t(`method_${dep.method}` as TranslationKey)}</Badge>
                  </div>
                  <div className="text-sm font-semibold text-charcoal">
                    {stu?.fullName ?? dep.studentId} —{' '}
                    <span className="tabular-nums">
                      {formatCurrencyExact(dep.amount, state.language)}
                    </span>
                  </div>
                  <div className="text-xs text-softgray">
                    {cls?.name} · {t('collector')}: {dep.collectorName} · {dep.date}
                    {dep.confirmedByName && ` · Confirmed by ${dep.confirmedByName}`}
                  </div>
                  {dep.notes && <p className="text-xs text-softgray italic">{dep.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => setPreviewDep(dep)}>
                    <Eye className="w-3.5 h-3.5" />
                    {isPending
                      ? state.language === 'es'
                        ? 'Recibo Pendiente'
                        : 'Pending Receipt'
                      : state.language === 'es'
                        ? 'Ver Recibo'
                        : 'Receipt'}
                  </Button>
                  {isPending && currentUser && canConfirmDeposit(currentUser) && (
                    <Button size="sm" onClick={() => setConfirmTarget(dep)}>
                      {t('confirm')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Take Deposit Modal */}
      <Modal
        open={takeOpen}
        onClose={() => setTakeOpen(false)}
        title={state.language === 'es' ? 'Registrar Nuevo Depósito' : 'Record New Deposit'}
        subtitle={
          state.language === 'es'
            ? 'El depósito queda pendiente hasta ser confirmado por un Propietario.'
            : 'Deposit will be assigned a sequential LVB receipt number and await Owner confirmation.'
        }
      >
        <form onSubmit={handleTakeSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-status-redBg text-status-red text-xs">{formError}</div>
          )}
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">
              {state.language === 'es' ? 'Alumna *' : 'Student *'}
            </span>
            <select
              value={form.studentId}
              onChange={(e) => {
                const stu = state.students.find((s) => s.id === e.target.value);
                setForm((f) => ({
                  ...f,
                  studentId: e.target.value,
                  amount: String(stu?.depositExpected ?? 50),
                }));
              }}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
            >
              {eligibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-charcoal">{t('amount')} ($)</span>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain tabular-nums font-semibold"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">{t('paymentMethod')}</span>
              <select
                value={form.method}
                onChange={(e) =>
                  setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))
                }
                className="mt-1 w-full h-10 px-2.5 rounded-lg border border-hairline bg-porcelain"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`method_${m}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">{t('date')}</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full h-10 px-2.5 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">{t('notes')}</span>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTakeOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Owner Confirm Modal */}
      <Modal
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        title={state.language === 'es' ? 'Confirmar Depósito' : 'Confirm Student Deposit'}
      >
        {confirmTarget && (() => {
          const stu = state.students.find((s) => s.id === confirmTarget.studentId);
          return (
            <div className="space-y-4">
              <Card className="p-4 bg-porcelain space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-softgray">{t('receiptNumber')}</span>
                  <span className="font-mono font-semibold">{confirmTarget.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-softgray">Student</span>
                  <span className="font-semibold">{stu?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-softgray">{t('amount')}</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrencyExact(confirmTarget.amount, state.language)}
                  </span>
                </div>
              </Card>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmTarget(null)}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={() => {
                    confirmDeposit(confirmTarget.id);
                    setConfirmTarget(null);
                  }}
                >
                  {t('confirm')}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Printable Atelier Receipt Preview */}
      <Modal
        open={Boolean(previewDep)}
        onClose={() => setPreviewDep(null)}
        title={previewDep ? `${t('receiptNumber')} ${previewDep.receiptNumber}` : ''}
        maxWidth="max-w-xl"
      >
        {previewDep && (() => {
          const stu = state.students.find((s) => s.id === previewDep.studentId);
          const cls = state.classes.find((c) => c.id === previewDep.classId);
          const isConfirmed = previewDep.status === 'confirmed';
          return (
            <div className="space-y-4">
              <div className="rounded-atelier border border-hairline overflow-hidden bg-white">
                <div className="bg-olive text-white px-5 py-4 border-b-2 border-clay flex items-center justify-between">
                  <div>
                    <div className="font-editorial text-xl">LVB Pulse</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-mist/80 mt-0.5">
                      La Voute Beauty Academy LLC
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">{previewDep.receiptNumber}</div>
                    <div className="text-xs text-mist/80">{previewDep.date}</div>
                  </div>
                </div>
                <div
                  className={`px-5 py-2 text-xs font-semibold ${
                    isConfirmed
                      ? 'bg-status-greenBg text-status-green'
                      : 'bg-status-amberBg text-status-amber'
                  }`}
                >
                  {isConfirmed
                    ? 'CONFIRMED DEPOSIT — RECORDED IN LEDGER'
                    : 'AWAITING OWNER CONFIRMATION — NOT YET A CONFIRMED PAYMENT'}
                </div>
                <div className="p-5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-softgray">Student</div>
                    <div className="font-semibold text-charcoal mt-0.5">{stu?.fullName}</div>
                  </div>
                  <div>
                    <div className="text-softgray">Class</div>
                    <div className="font-semibold text-charcoal mt-0.5">{cls?.name}</div>
                  </div>
                  <div>
                    <div className="text-softgray">{t('paymentMethod')}</div>
                    <div className="font-medium text-charcoal mt-0.5">
                      {t(`method_${previewDep.method}` as TranslationKey)}
                    </div>
                  </div>
                  <div>
                    <div className="text-softgray">{t('collector')}</div>
                    <div className="font-medium text-charcoal mt-0.5">{previewDep.collectorName}</div>
                  </div>
                  <div className="col-span-2 p-4 rounded-lg bg-porcelain border border-hairline flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-softgray">
                      {t('deposit')}
                    </span>
                    <span className="font-editorial text-2xl text-charcoal tabular-nums">
                      {formatCurrencyExact(previewDep.amount, state.language)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" />
                  {t('print')}
                </Button>
                {stu && (
                  <Button
                    onClick={() =>
                      generateReceiptPdf({
                        receiptNumber: previewDep.receiptNumber,
                        student: stu,
                        academyClass: cls,
                        date: previewDep.date,
                        amount: previewDep.amount,
                        method: previewDep.method,
                        collectorName: previewDep.collectorName,
                        isConfirmed,
                        categoryLabel: t('deposit'),
                        notes: previewDep.notes,
                        language: state.language,
                      })
                    }
                  >
                    <Download className="w-4 h-4" />
                    {t('exportPdf')}
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
