import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Plus,
  Download,
  Lock,
  CheckCircle2,
  Clock,
  Eye,
  Search,
  Printer,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  canConfirmDeposit,
  canRecordPayment,
  canTakeDeposit,
  canViewPayment,
  canViewStudent,
} from '../../permissions/permissions';
import {
  formatCurrencyExact,
  getStudentFinancialSummary,
  roundCurrency,
  summarizePaymentsByMethod,
} from '../../calculations/paymentEngine';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import { generateReceiptPdf } from '../../services/pdfExport';
import type { Deposit, Payment, PaymentMethod } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

const METHODS: PaymentMethod[] = ['cash', 'card', 'zelle', 'venmo', 'cash_app', 'check', 'other'];

export const PaymentsPage: React.FC = () => {
  const { state, currentUser, createPayment, createDeposit, confirmDeposit, t } = useApp();

  const [tab, setTab] = useState<'payments' | 'deposits'>('payments');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [recordMode, setRecordMode] = useState<'payment' | 'deposit' | null>(null);
  const [confirmDepTarget, setConfirmDepTarget] = useState<Deposit | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<{
    receiptNumber: string;
    studentId: string;
    classId: string;
    date: string;
    amount: number;
    method: PaymentMethod;
    collectorName: string;
    isConfirmed: boolean;
    categoryLabel: string;
    notes: string;
  } | null>(null);

  const visiblePayments = useMemo(() => {
    if (!currentUser) return [];
    const q = search.trim().toLowerCase();
    return state.payments
      .filter((p) => canViewPayment(currentUser, p))
      .filter((p) => (methodFilter === 'all' ? true : p.method === methodFilter))
      .filter((p) => {
        if (!q) return true;
        const stu = state.students.find((s) => s.id === p.studentId);
        return (
          p.receiptNumber.toLowerCase().includes(q) ||
          (stu?.fullName.toLowerCase().includes(q) ?? false) ||
          p.collectorName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.receiptNumber.localeCompare(a.receiptNumber));
  }, [state.payments, state.students, currentUser, methodFilter, search]);

  const visibleDeposits = useMemo(() => {
    if (!currentUser) return [];
    return state.deposits
      .filter((d) => currentUser.role === 'owner' || d.collectorId === currentUser.id)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return b.date.localeCompare(a.date);
      });
  }, [state.deposits, currentUser]);

  const summary = useMemo(() => summarizePaymentsByMethod(visiblePayments), [visiblePayments]);
  const pendingDeposits = useMemo(
    () => visibleDeposits.filter((d) => d.status === 'pending'),
    [visibleDeposits]
  );

  // Form state for recording payment or deposit
  const eligibleStudents = useMemo(() => {
    if (!currentUser) return [];
    return state.students.filter((s) => canViewStudent(currentUser, s));
  }, [state.students, currentUser]);

  const [form, setForm] = useState({
    studentId: eligibleStudents[0]?.id ?? 'stu-01',
    amount: '30',
    method: 'cash' as PaymentMethod,
    week: 4,
    date: '2026-11-24',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const openModal = (mode: 'payment' | 'deposit') => {
    const firstStu = eligibleStudents[0];
    const cls = firstStu ? state.classes.find((c) => c.id === firstStu.classId) : undefined;
    const fin = firstStu
      ? getStudentFinancialSummary(firstStu, cls, state.payments, state.deposits)
      : null;
    setForm({
      studentId: firstStu?.id ?? '',
      amount: String(
        mode === 'deposit'
          ? firstStu?.depositExpected ?? 50
          : fin?.dueThisWeek || fin?.weeklyScheduledAmount || 30
      ),
      method: 'cash',
      week: cls?.currentWeek ?? 1,
      date: '2026-11-24',
      notes: '',
    });
    setFormError('');
    setRecordMode(mode);
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = state.students.find((s) => s.id === form.studentId);
    if (!stu) {
      setFormError('Please select a valid student.');
      return;
    }
    if (recordMode === 'deposit') {
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
      setRecordMode(null);
      setTab('deposits');
    } else {
      const res = createPayment({
        studentId: stu.id,
        classId: stu.classId,
        week: Number(form.week),
        date: form.date,
        amount: Number(form.amount),
        method: form.method,
        category: Number(form.week) === 1 ? 'first_class' : 'weekly',
        notes: form.notes,
      });
      if (!res.ok) {
        setFormError(res.error ?? 'Could not save payment.');
        return;
      }
      setRecordMode(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_payments')}
        phase={t('phase1')}
        subtitle={
          currentUser?.role === 'owner'
            ? state.language === 'es'
              ? 'Registro completo de pagos, depósitos pendientes de confirmación y recibos secuenciales LVB.'
              : 'Complete payment ledger, deposit confirmation queue, and sequential LVB receipts.'
            : state.language === 'es'
              ? 'Tus cobros y depósitos registrados (los cobros de otras personas permanecen privados).'
              : 'Your own recorded payments and deposits (other collectors remain private).'
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {currentUser && canTakeDeposit(currentUser) && (
              <Button variant="champagne" onClick={() => openModal('deposit')}>
                <Plus className="w-4 h-4" />
                {state.language === 'es' ? 'Registrar Depósito' : 'Take Deposit'}
              </Button>
            )}
            {currentUser && canRecordPayment(currentUser) && (
              <Button onClick={() => openModal('payment')}>
                <Plus className="w-4 h-4" />
                {state.language === 'es' ? 'Registrar Pago' : 'Record Payment'}
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label={state.language === 'es' ? 'Total Mostrado' : 'Filtered Total'}
          value={formatCurrencyExact(summary.overallTotal, state.language)}
          subtext={`${summary.count} ${state.language === 'es' ? 'recibos' : 'receipts'}`}
        />
        <KpiCard
          label={t('method_cash')}
          value={formatCurrencyExact(summary.cashTotal, state.language)}
          tone="sage"
        />
        <KpiCard
          label={state.language === 'es' ? 'Tarjeta y Digital' : 'Card & Digital'}
          value={formatCurrencyExact(
            roundCurrency(summary.cardTotal + summary.digitalTotal),
            state.language
          )}
        />
        <KpiCard
          label={t('kpiPendingDeposits')}
          value={`${pendingDeposits.length} · ${formatCurrencyExact(
            pendingDeposits.reduce((s, d) => s + d.amount, 0),
            state.language
          )}`}
          tone={pendingDeposits.length > 0 ? 'amber' : 'sage'}
          onClick={() => setTab('deposits')}
        />
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex bg-white border border-borderwarm rounded-lg p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('payments')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'payments' ? 'bg-navy text-white' : 'text-slatewarm hover:text-navy'
            }`}
          >
            {state.language === 'es' ? 'Pagos Confirmados' : 'Confirmed Payments'} (
            {visiblePayments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('deposits')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
              tab === 'deposits' ? 'bg-navy text-white' : 'text-slatewarm hover:text-navy'
            }`}
          >
            {state.language === 'es' ? 'Depósitos y Aprobación' : 'Deposits & Approval'}
            {pendingDeposits.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-champagne text-white">
                {pendingDeposits.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'payments' && (
          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slatewarm absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  state.language === 'es'
                    ? 'Buscar recibo LVB-000... o alumna'
                    : 'Search receipt LVB-000... or student'
                }
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-borderwarm rounded-lg"
              />
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white border border-borderwarm rounded-lg"
            >
              <option value="all">{t('all')}</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`method_${m}` as TranslationKey)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Payments Table & Mobile Cards */}
      {tab === 'payments' ? (
        visiblePayments.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-5 h-5" />}
            title={t('noResults')}
            description={t('noResultsHint')}
          />
        ) : (
          <>
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-porcelain border-b border-borderwarm text-[11px] font-semibold uppercase tracking-wider text-slatewarm">
                      <th className="py-3 px-4">{t('receiptNumber')}</th>
                      <th className="py-3 px-4">{t('date')}</th>
                      <th className="py-3 px-4">{state.language === 'es' ? 'Alumna' : 'Student'}</th>
                      <th className="py-3 px-4">{state.language === 'es' ? 'Concepto' : 'Category'}</th>
                      <th className="py-3 px-4">{t('paymentMethod')}</th>
                      <th className="py-3 px-4">{t('collector')}</th>
                      <th className="py-3 px-4 text-right">{t('amount')}</th>
                      <th className="py-3 px-4 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderwarm">
                    {visiblePayments.map((p) => {
                      const stu = state.students.find((s) => s.id === p.studentId);
                      const cls = state.classes.find((c) => c.id === p.classId);
                      return (
                        <tr key={p.id} className="hover:bg-porcelain/60">
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-navy">
                            <span className="inline-flex items-center gap-1.5">
                              {p.receiptNumber}
                              {p.locked && (
                                <span title={t('locked')}>
                                  <Lock className="w-3 h-3 text-champagne" />
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slatewarm tabular-nums">
                            {p.date}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-navy text-xs">
                              {stu?.fullName ?? p.studentId}
                            </div>
                            <div className="text-[11px] text-slatewarm">{cls?.name}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-navy">
                            {p.category === 'deposit' ? t('deposit') : `Week ${p.week}`}
                          </td>
                          <td className="py-3 px-4">
                            <Badge tone={p.method === 'cash' ? 'champagne' : 'slate'}>
                              {t(`method_${p.method}` as TranslationKey)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-slatewarm">{p.collectorName}</td>
                          <td className="py-3 px-4 text-right font-semibold text-navy tabular-nums">
                            {formatCurrencyExact(p.amount, state.language)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewReceipt({
                                    receiptNumber: p.receiptNumber,
                                    studentId: p.studentId,
                                    classId: p.classId,
                                    date: p.date,
                                    amount: p.amount,
                                    method: p.method,
                                    collectorName: p.collectorName,
                                    isConfirmed: true,
                                    categoryLabel:
                                      p.category === 'deposit' ? t('deposit') : `Week ${p.week} Tuition`,
                                    notes: p.notes,
                                  })
                                }
                                className="p-1.5 rounded-md hover:bg-ivory text-navy"
                                title="Preview Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {stu && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    generateReceiptPdf({
                                      receiptNumber: p.receiptNumber,
                                      student: stu,
                                      academyClass: cls,
                                      date: p.date,
                                      amount: p.amount,
                                      method: p.method,
                                      collectorName: p.collectorName,
                                      isConfirmed: true,
                                      categoryLabel:
                                        p.category === 'deposit'
                                          ? t('deposit')
                                          : `Week ${p.week} Tuition`,
                                      notes: p.notes,
                                      language: state.language,
                                    })
                                  }
                                  className="p-1.5 rounded-md hover:bg-ivory text-navy"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2.5">
              {visiblePayments.map((p) => {
                const stu = state.students.find((s) => s.id === p.studentId);
                return (
                  <Card key={p.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-navy inline-flex items-center gap-1">
                        {p.receiptNumber}
                        {p.locked && <Lock className="w-3 h-3 text-champagne" />}
                      </span>
                      <span className="font-semibold text-navy tabular-nums">
                        {formatCurrencyExact(p.amount, state.language)}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-navy">{stu?.fullName}</div>
                    <div className="flex items-center justify-between text-xs text-slatewarm">
                      <span>
                        {p.date} · {t(`method_${p.method}` as TranslationKey)} · {p.collectorName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewReceipt({
                            receiptNumber: p.receiptNumber,
                            studentId: p.studentId,
                            classId: p.classId,
                            date: p.date,
                            amount: p.amount,
                            method: p.method,
                            collectorName: p.collectorName,
                            isConfirmed: true,
                            categoryLabel:
                              p.category === 'deposit' ? t('deposit') : `Week ${p.week} Tuition`,
                            notes: p.notes,
                          })
                        }
                        className="text-champagne font-medium"
                      >
                        {state.language === 'es' ? 'Recibo' : 'Receipt'}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )
      ) : (
        /* Tab 2: Deposits Workflow */
        <div className="space-y-3">
          {visibleDeposits.map((dep) => {
            const stu = state.students.find((s) => s.id === dep.studentId);
            const cls = state.classes.find((c) => c.id === dep.classId);
            const isPending = dep.status === 'pending';

            return (
              <Card
                key={dep.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isPending ? 'border-amberwarm/50 bg-amberwarm-light/25' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-navy">
                      {dep.receiptNumber}
                    </span>
                    <Badge tone={isPending ? 'amber' : 'sage'}>
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
                    <Badge tone="slate">{t(`method_${dep.method}` as TranslationKey)}</Badge>
                  </div>
                  <div className="text-sm font-semibold text-navy">
                    {stu?.fullName ?? dep.studentId} —{' '}
                    <span className="tabular-nums">
                      {formatCurrencyExact(dep.amount, state.language)}
                    </span>
                  </div>
                  <div className="text-xs text-slatewarm">
                    {cls?.name} · {t('collector')}: {dep.collectorName} · {dep.date}
                    {dep.confirmedByName && (
                      <span>
                        {' '}
                        · Confirmed by {dep.confirmedByName}
                      </span>
                    )}
                  </div>
                  {dep.notes && <p className="text-xs text-slatewarm italic">{dep.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setPreviewReceipt({
                        receiptNumber: dep.receiptNumber,
                        studentId: dep.studentId,
                        classId: dep.classId,
                        date: dep.date,
                        amount: dep.amount,
                        method: dep.method,
                        collectorName: dep.collectorName,
                        isConfirmed: dep.status === 'confirmed',
                        categoryLabel: t('deposit'),
                        notes: dep.notes,
                      })
                    }
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isPending
                      ? state.language === 'es'
                        ? 'Recibo Pendiente'
                        : 'Pending Receipt'
                      : state.language === 'es'
                        ? 'Ver Recibo'
                        : 'View Receipt'}
                  </Button>
                  {isPending && currentUser && canConfirmDeposit(currentUser) && (
                    <Button size="sm" onClick={() => setConfirmDepTarget(dep)}>
                      {t('confirm')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Record Payment / Deposit Modal */}
      <Modal
        open={Boolean(recordMode)}
        onClose={() => setRecordMode(null)}
        title={
          recordMode === 'deposit'
            ? state.language === 'es'
              ? 'Tomar Depósito de Inscripción'
              : 'Record Enrollment Deposit'
            : state.language === 'es'
              ? 'Registrar Pago de Alumna'
              : 'Record Student Payment'
        }
        subtitle={
          recordMode === 'deposit'
            ? state.language === 'es'
              ? 'Los depósitos nuevos comienzan como Pendientes hasta ser confirmados por un propietario.'
              : 'New deposits begin as Pending Owner Confirmation and receive a sequential LVB receipt number.'
            : undefined
        }
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-terracotta-light text-terracotta-dark text-xs">
              {formError}
            </div>
          )}
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">
              {state.language === 'es' ? 'Alumna *' : 'Student *'}
            </span>
            <select
              value={form.studentId}
              onChange={(e) => {
                const stu = state.students.find((s) => s.id === e.target.value);
                const cls = stu ? state.classes.find((c) => c.id === stu.classId) : undefined;
                const fin = stu
                  ? getStudentFinancialSummary(stu, cls, state.payments, state.deposits)
                  : null;
                setForm((f) => ({
                  ...f,
                  studentId: e.target.value,
                  week: cls?.currentWeek ?? f.week,
                  amount: String(
                    recordMode === 'deposit'
                      ? stu?.depositExpected ?? 50
                      : fin?.dueThisWeek || fin?.weeklyScheduledAmount || 30
                  ),
                }));
              }}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
            >
              {eligibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('amount')} ($) *</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain tabular-nums font-semibold"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('paymentMethod')}</span>
              <select
                value={form.method}
                onChange={(e) =>
                  setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`method_${m}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
            {recordMode === 'payment' && (
              <label className="block">
                <span className="text-xs font-medium text-navy">
                  {state.language === 'es' ? 'Semana' : 'Week'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.week}
                  onChange={(e) => setForm((f) => ({ ...f, week: Number(e.target.value) }))}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('date')} *</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">{t('notes')}</span>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRecordMode(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deposit Modal (Explicit Financial Confirmation) */}
      <Modal
        open={Boolean(confirmDepTarget)}
        onClose={() => setConfirmDepTarget(null)}
        title={state.language === 'es' ? 'Confirmar Depósito' : 'Confirm Deposit'}
      >
        {confirmDepTarget && (() => {
          const stu = state.students.find((s) => s.id === confirmDepTarget.studentId);
          return (
            <div className="space-y-4">
              <p className="text-xs text-slatewarm">
                {state.language === 'es'
                  ? 'Confirmar este depósito lo agregará al libro contable confirmado, actualizará el saldo de la alumna y marcará "Depósito confirmado" en su lista de inscripción.'
                  : 'Confirming posts this deposit to the confirmed ledger, updates the student balance, and checks off "Deposit confirmed" on their enrollment checklist.'}
              </p>
              <div className="p-4 rounded-xl bg-porcelain border border-borderwarm space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slatewarm">{t('receiptNumber')}</span>
                  <span className="font-mono font-semibold text-navy">
                    {confirmDepTarget.receiptNumber}
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
                    {formatCurrencyExact(confirmDepTarget.amount, state.language)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slatewarm">{t('collector')}</span>
                  <span className="text-navy">{confirmDepTarget.collectorName}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmDepTarget(null)}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={() => {
                    confirmDeposit(confirmDepTarget.id);
                    setConfirmDepTarget(null);
                  }}
                >
                  {t('confirm')}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Branded Printable Receipt Preview Modal */}
      <Modal
        open={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        title={previewReceipt ? `${t('receiptNumber')} ${previewReceipt.receiptNumber}` : ''}
        maxWidth="max-w-xl"
      >
        {previewReceipt && (() => {
          const stu = state.students.find((s) => s.id === previewReceipt.studentId);
          const cls = state.classes.find((c) => c.id === previewReceipt.classId);
          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-borderwarm overflow-hidden bg-white">
                <div className="bg-navy text-white px-5 py-4 border-b-2 border-champagne flex items-center justify-between">
                  <div>
                    <div className="font-editorial text-xl leading-none">LVB Pulse</div>
                    <div className="text-[10px] tracking-[0.16em] text-champagne-soft uppercase mt-1">
                      La Voute Beauty Academy LLC
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">
                      {previewReceipt.receiptNumber}
                    </div>
                    <div className="text-[11px] text-white/70">{previewReceipt.date}</div>
                  </div>
                </div>

                <div
                  className={`px-5 py-2 text-xs font-semibold ${
                    previewReceipt.isConfirmed
                      ? 'bg-sage-light text-sage-dark'
                      : 'bg-amberwarm-light text-amberwarm-dark'
                  }`}
                >
                  {previewReceipt.isConfirmed
                    ? state.language === 'es'
                      ? 'PAGO CONFIRMADO — REGISTRADO EN CONTABILIDAD'
                      : 'CONFIRMED PAYMENT — POSTED TO ACADEMY LEDGER'
                    : state.language === 'es'
                      ? 'PENDIENTE DE CONFIRMACIÓN POR PROPIETARIO (NO CONFIRMADO AÚN)'
                      : 'PENDING OWNER CONFIRMATION — NOT YET A CONFIRMED PAYMENT'}
                </div>

                <div className="p-5 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slatewarm">{state.language === 'es' ? 'Alumna' : 'Student'}</div>
                      <div className="font-semibold text-navy mt-0.5">{stu?.fullName}</div>
                    </div>
                    <div>
                      <div className="text-slatewarm">{state.language === 'es' ? 'Curso / Clase' : 'Course / Class'}</div>
                      <div className="font-semibold text-navy mt-0.5">
                        {stu?.program} · {cls?.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-slatewarm">{t('paymentMethod')}</div>
                      <div className="font-medium text-navy mt-0.5">
                        {t(`method_${previewReceipt.method}` as TranslationKey)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slatewarm">{t('collector')}</div>
                      <div className="font-medium text-navy mt-0.5">
                        {previewReceipt.collectorName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-4 rounded-xl bg-porcelain border border-champagne/40 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slatewarm">
                        {previewReceipt.categoryLabel}
                      </div>
                      <div className="text-xs text-slatewarm mt-0.5">
                        {previewReceipt.notes || '—'}
                      </div>
                    </div>
                    <div className="font-editorial text-2xl text-navy tabular-nums">
                      {formatCurrencyExact(previewReceipt.amount, state.language)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" />
                  {t('print')}
                </Button>
                {stu && (
                  <Button
                    onClick={() =>
                      generateReceiptPdf({
                        receiptNumber: previewReceipt.receiptNumber,
                        student: stu,
                        academyClass: cls,
                        date: previewReceipt.date,
                        amount: previewReceipt.amount,
                        method: previewReceipt.method,
                        collectorName: previewReceipt.collectorName,
                        isConfirmed: previewReceipt.isConfirmed,
                        categoryLabel: previewReceipt.categoryLabel,
                        notes: previewReceipt.notes,
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
