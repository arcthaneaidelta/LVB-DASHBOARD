import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  DollarSign,
  Grid3X3,
  ListChecks,
  Send,
  ArrowRight,
  Info,
} from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { useApp } from '../../services/store';
import { canViewClass, canViewClassWideFinancialTotals } from '../../permissions/permissions';
import {
  formatCurrencyExact,
  getStudentFinancialSummary,
  roundCurrency,
} from '../../calculations/paymentEngine';
import {
  Badge,
  Button,
  Card,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { AttendanceStatus, PaymentMethod, Student } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

const ATTENDANCE_OPTIONS: { code: AttendanceStatus; labelKey: TranslationKey; activeClass: string }[] = [
  { code: 'P', labelKey: 'att_P', activeClass: 'bg-status-green text-white border-status-green' },
  { code: 'A', labelKey: 'att_A', activeClass: 'bg-status-red text-white border-status-red' },
  { code: 'C', labelKey: 'att_C', activeClass: 'bg-charcoal text-white border-charcoal' },
  { code: 'E', labelKey: 'att_E', activeClass: 'bg-status-amber text-white border-status-amber' },
];

const METHODS: PaymentMethod[] = ['cash', 'card', 'zelle', 'venmo', 'cash_app', 'check', 'other'];

export const ClassLogPage: React.FC = () => {
  const { state, currentUser, recordAttendance, createPayment, submitClassLog, pushToast, t } =
    useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const authorizedClasses = useMemo(() => {
    if (!currentUser) return [];
    return state.classes.filter((c) => canViewClass(currentUser, c));
  }, [state.classes, currentUser]);

  const initialClassId =
    searchParams.get('classId') &&
    authorizedClasses.some((c) => c.id === searchParams.get('classId'))
      ? searchParams.get('classId')!
      : authorizedClasses[0]?.id ?? '';

  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const selectedClass = useMemo(
    () =>
      authorizedClasses.find((c) => c.id === selectedClassId) ??
      authorizedClasses[0] ??
      null,
    [authorizedClasses, selectedClassId]
  );

  const initialWeek = Number(searchParams.get('week')) || selectedClass?.currentWeek || 1;
  const [selectedWeek, setSelectedWeek] = useState<number>(initialWeek);
  const [viewMode, setViewMode] = useState<'weekly' | 'grid'>('weekly');
  const [payTarget, setPayTarget] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState('');

  const sessionDate = useMemo(() => {
    if (!selectedClass) return '2026-11-24';
    try {
      const start = parseISO(selectedClass.startDate);
      return format(addDays(start, (selectedWeek - 1) * 7), 'yyyy-MM-dd');
    } catch {
      return '2026-11-24';
    }
  }, [selectedClass, selectedWeek]);

  const roster = useMemo(() => {
    if (!selectedClass) return [];
    return state.students.filter((s) => s.classId === selectedClass.id);
  }, [state.students, selectedClass]);

  const submission = useMemo(() => {
    if (!selectedClass) return null;
    return (
      state.classLogSubmissions.find(
        (sub) => sub.classId === selectedClass.id && sub.week === selectedWeek
      ) ?? null
    );
  }, [state.classLogSubmissions, selectedClass, selectedWeek]);

  const instructorNames = useMemo(() => {
    if (!selectedClass) return '';
    return state.users
      .filter((u) => selectedClass.instructorIds.includes(u.id))
      .map((u) => u.name)
      .join(', ');
  }, [selectedClass, state.users]);

  // Own payments collected in this session vs owner class-wide total
  const sessionStats = useMemo(() => {
    if (!selectedClass || !currentUser) {
      return { loggedCount: 0, presentCount: 0, collectedTotal: 0 };
    }
    const attForWeek = state.attendance.filter(
      (a) => a.classId === selectedClass.id && a.week === selectedWeek
    );
    const paymentsForWeek = state.payments.filter(
      (p) =>
        p.status === 'confirmed' &&
        p.classId === selectedClass.id &&
        p.week === selectedWeek &&
        (canViewClassWideFinancialTotals(currentUser) || p.collectorId === currentUser.id)
    );
    return {
      loggedCount: attForWeek.length,
      presentCount: attForWeek.filter((a) => a.status === 'P').length,
      collectedTotal: roundCurrency(paymentsForWeek.reduce((s, p) => s + p.amount, 0)),
    };
  }, [state.attendance, state.payments, selectedClass, selectedWeek, currentUser]);

  const handleAttendanceTap = (student: Student, status: AttendanceStatus) => {
    if (!selectedClass) return;
    recordAttendance({
      studentId: student.id,
      classId: selectedClass.id,
      week: selectedWeek,
      date: sessionDate,
      status,
    });
    if (status === 'A' || status === 'E') {
      pushToast(
        state.language === 'es'
          ? `${student.fullName}: marcada ${t(`att_${status}` as TranslationKey)} — registro de falta creado y cuota semanal omitida.`
          : `${student.fullName}: marked ${t(`att_${status}` as TranslationKey)} — open missed-class record created, weekly payment skipped.`,
        'info'
      );
    } else if (status === 'C') {
      pushToast(
        state.language === 'es'
          ? `${student.fullName}: clase cancelada — sin falta ni cobro esta semana.`
          : `${student.fullName}: marked Cancelled — payment skipped, no makeup required.`,
        'info'
      );
    }
  };

  const openQuickPayment = (student: Student) => {
    if (!selectedClass) return;
    const fin = getStudentFinancialSummary(
      student,
      selectedClass,
      state.payments,
      state.deposits,
      selectedWeek
    );
    setPayTarget(student);
    setPayAmount(String(fin.dueThisWeek > 0 ? fin.dueThisWeek : fin.remainingBalance));
    setPayMethod('cash');
    setPayNote('');
    setPayError('');
  };

  const handleQuickPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || !selectedClass) return;
    const res = createPayment({
      studentId: payTarget.id,
      classId: selectedClass.id,
      week: selectedWeek,
      date: sessionDate,
      amount: Number(payAmount),
      method: payMethod,
      category: selectedWeek === 1 ? 'first_class' : 'weekly',
      notes: payNote || `Week ${selectedWeek} class collection`,
    });
    if (!res.ok) {
      setPayError(res.error ?? 'Invalid payment');
      return;
    }
    setPayTarget(null);
  };

  if (!selectedClass) {
    return (
      <div className="p-6 text-sm text-softgray">
        {state.language === 'es'
          ? 'No tienes clases asignadas.'
          : 'No classes assigned to your account.'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav_classLog')}
        phase={t('phase1')}
        subtitle={
          state.language === 'es'
            ? 'Asistencia en un toque y cobro semanal diseñado para usar directamente durante clase.'
            : 'One-tap weekly attendance and real-time tuition collection designed for in-studio mobile and desktop use.'
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-hairline bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 ${
                  viewMode === 'weekly' ? 'bg-olive text-white' : 'text-softgray'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                {state.language === 'es' ? 'Sesión Semanal' : 'Weekly Roster'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 ${
                  viewMode === 'grid' ? 'bg-olive text-white' : 'text-softgray'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                {state.language === 'es' ? 'Matriz Completa' : 'Full-Course Grid'}
              </button>
            </div>
          </div>
        }
      />

      {/* Class & Week Selector Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <select
              value={selectedClass.id}
              onChange={(e) => {
                const nextCls = authorizedClasses.find((c) => c.id === e.target.value);
                setSelectedClassId(e.target.value);
                if (nextCls) setSelectedWeek(nextCls.currentWeek);
              }}
              aria-label="Select class"
              className="h-10 px-3 rounded-lg border border-hairline bg-porcelain text-sm font-semibold text-charcoal"
            >
              {authorizedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.weekday})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-xs text-softgray flex-wrap">
              <span>{instructorNames}</span>
              <span>·</span>
              <span className="font-medium text-charcoal">{sessionDate}</span>
              <Badge tone={submission ? 'sage' : 'amber'}>
                {submission
                  ? state.language === 'es'
                    ? 'Sesión Enviada'
                    : 'Submitted'
                  : state.language === 'es'
                    ? 'En Progreso'
                    : 'Open'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-porcelain border border-hairline">
              <span className="text-softgray">
                {state.language === 'es' ? 'Asistencia:' : 'Logged:'}{' '}
              </span>
              <span className="font-semibold text-charcoal tabular-nums">
                {sessionStats.loggedCount}/{roster.length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-mist/70 border border-clay/40">
              <span className="text-softgray">
                {currentUser?.role === 'owner'
                  ? state.language === 'es'
                    ? 'Cobrado Sem.:'
                    : 'Week Total:'
                  : state.language === 'es'
                    ? 'Mis Cobros:'
                    : 'My Collected:'}{' '}
              </span>
              <span className="font-semibold text-charcoal tabular-nums">
                {formatCurrencyExact(sessionStats.collectedTotal, state.language)}
              </span>
            </div>
          </div>
        </div>

        {/* Week Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: selectedClass.weeks }, (_, i) => i + 1).map((wk) => {
            const isSub = state.classLogSubmissions.some(
              (s) => s.classId === selectedClass.id && s.week === wk
            );
            const active = wk === selectedWeek;
            return (
              <button
                key={wk}
                type="button"
                onClick={() => setSelectedWeek(wk)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors shrink-0 inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-olive text-white border-olive'
                    : 'bg-porcelain text-charcoal border-hairline hover:border-clay'
                }`}
              >
                <span>
                  {state.language === 'es' ? `Semana ${wk}` : `Week ${wk}`}
                </span>
                {isSub && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${active ? 'text-mist' : 'text-status-green'}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Attendance Legend / Rule Helper */}
      <div className="px-4 py-2.5 rounded-xl bg-white border border-hairline text-xs text-softgray flex items-center gap-2 flex-wrap">
        <Info className="w-4 h-4 text-clay-dark shrink-0" />
        <span>
          <strong className="text-charcoal">P</strong> ({t('att_P')}) ={' '}
          {state.language === 'es' ? 'habilita cobro' : 'payment enabled'} ·{' '}
          <strong className="text-charcoal">A</strong> ({t('att_A')}) &{' '}
          <strong className="text-charcoal">E</strong> ({t('att_E')}) ={' '}
          {state.language === 'es'
            ? 'omite cobro y crea clase perdida'
            : 'skips week payment & creates missed-class record'}{' '}
          · <strong className="text-charcoal">C</strong> ({t('att_C')}) ={' '}
          {state.language === 'es'
            ? 'omite cobro sin falta'
            : 'skips payment, no makeup needed'}
        </span>
      </div>

      {viewMode === 'weekly' ? (
        <div className="space-y-3">
          {roster.map((student) => {
            const att = state.attendance.find(
              (a) =>
                a.studentId === student.id &&
                a.classId === selectedClass.id &&
                a.week === selectedWeek
            );
            const fin = getStudentFinancialSummary(
              student,
              selectedClass,
              state.payments,
              state.deposits,
              selectedWeek
            );
            const weekPayments = state.payments.filter(
              (p) =>
                p.status === 'confirmed' &&
                p.studentId === student.id &&
                p.classId === selectedClass.id &&
                p.week === selectedWeek &&
                (currentUser?.role === 'owner' || p.collectorId === currentUser?.id)
            );
            const paidThisWeek = roundCurrency(
              weekPayments.reduce((s, p) => s + p.amount, 0)
            );
            const canCollectHere = !att || att.status === 'P';

            return (
              <Card key={student.id} className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Student Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/app/students?studentId=${student.id}`)}
                        className="font-semibold text-charcoal hover:text-clay-dark transition-colors text-left"
                      >
                        {student.fullName}
                      </button>
                      {student.enrollmentStatus === 'pending' && (
                        <Badge tone="amber">{t('status_pending')}</Badge>
                      )}
                      {fin.isFullyPaid && (
                        <Badge tone="sage">
                          {state.language === 'es' ? 'Pagado Total' : 'Paid in Full'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-softgray mt-1 flex items-center gap-3 flex-wrap">
                      <span>
                        {t('dueThisWeek')}:{' '}
                        <strong className="text-charcoal tabular-nums">
                          {canCollectHere
                            ? formatCurrencyExact(fin.dueThisWeek, state.language)
                            : '$0.00 (skipped)'}
                        </strong>
                      </span>
                      <span>
                        {t('remainingBalance')}:{' '}
                        <strong className="text-charcoal tabular-nums">
                          {formatCurrencyExact(fin.remainingBalance, state.language)}
                        </strong>
                      </span>
                      {paidThisWeek > 0 && (
                        <span className="text-status-green font-semibold tabular-nums">
                          ✓ {state.language === 'es' ? 'Cobrado:' : 'Collected:'}{' '}
                          {formatCurrencyExact(paidThisWeek, state.language)} (
                          {weekPayments
                            .map((p) => t(`method_${p.method}` as TranslationKey))
                            .join(', ')}
                          )
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fast One-Tap Segmented Attendance Control */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    <div
                      className="grid grid-cols-4 gap-1 bg-porcelain p-1 rounded-xl border border-hairline"
                      role="group"
                      aria-label={`Attendance for ${student.fullName}`}
                    >
                      {ATTENDANCE_OPTIONS.map((opt) => {
                        const isSelected = att?.status === opt.code;
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => handleAttendanceTap(student, opt.code)}
                            className={`h-10 px-2.5 sm:px-3 rounded-lg text-xs font-semibold border transition-all flex flex-col items-center justify-center leading-none ${
                              isSelected
                                ? opt.activeClass
                                : 'bg-white text-charcoal border-transparent hover:border-hairline'
                            }`}
                            title={t(opt.labelKey)}
                          >
                            <span>{t(`attShort_${opt.code}` as TranslationKey)}</span>
                            <span className="text-[9.5px] font-normal opacity-80 mt-0.5 hidden sm:inline">
                              {t(opt.labelKey)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Payment Trigger */}
                    <Button
                      size="md"
                      variant={paidThisWeek > 0 ? 'secondary' : 'champagne'}
                      disabled={!canCollectHere || fin.isFullyPaid}
                      onClick={() => openQuickPayment(student)}
                      className="min-w-[132px]"
                    >
                      <DollarSign className="w-4 h-4" />
                      {fin.isFullyPaid
                        ? state.language === 'es'
                          ? 'Liquidado'
                          : 'Paid Full'
                        : !canCollectHere
                          ? state.language === 'es'
                            ? 'Omitido'
                            : 'Skipped'
                          : paidThisWeek > 0
                            ? state.language === 'es'
                              ? 'Agregar Pago'
                              : 'Add Payment'
                            : state.language === 'es'
                              ? 'Cobrar Cuota'
                              : 'Collect'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Session Submit Footer */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="text-xs text-softgray">
              {submission ? (
                <span>
                  {state.language === 'es' ? 'Último envío por' : 'Last submitted by'}{' '}
                  <strong className="text-charcoal">{submission.submittedByName}</strong> (
                  {submission.submittedAt.slice(0, 16).replace('T', ' ')})
                </span>
              ) : (
                <span>
                  {state.language === 'es'
                    ? 'Al enviar el registro de clase se actualiza la actividad y los totales de entrega de efectivo.'
                    : 'Submitting marks this class session complete and prepares your daily cash handoff.'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={() => navigate('/app/daily-cash-report')}
              >
                {t('nav_dailyCash')}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => submitClassLog(selectedClass.id, selectedWeek, sessionDate)}
              >
                <Send className="w-4 h-4" />
                {submission
                  ? state.language === 'es'
                    ? 'Actualizar Envío'
                    : 'Update Submission'
                  : state.language === 'es'
                    ? 'Enviar Registro de Clase'
                    : 'Submit Class Session'}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        /* Full-Course Attendance & Payment Grid */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-porcelain border-b border-hairline text-softgray uppercase tracking-wider">
                  <th className="py-3 px-4 sticky left-0 bg-porcelain z-10 min-w-[180px]">
                    {state.language === 'es' ? 'Alumna' : 'Student'}
                  </th>
                  {Array.from({ length: selectedClass.weeks }, (_, i) => i + 1).map((wk) => (
                    <th key={wk} className="py-3 px-3 text-center min-w-[92px]">
                      W{wk}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right min-w-[100px]">
                    {t('remainingBalance')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {roster.map((stu) => {
                  const fin = getStudentFinancialSummary(
                    stu,
                    selectedClass,
                    state.payments,
                    state.deposits
                  );
                  return (
                    <tr key={stu.id} className="hover:bg-porcelain/50">
                      <td className="py-3 px-4 font-semibold text-charcoal sticky left-0 bg-white">
                        {stu.fullName}
                      </td>
                      {Array.from({ length: selectedClass.weeks }, (_, i) => i + 1).map((wk) => {
                        const att = state.attendance.find(
                          (a) =>
                            a.studentId === stu.id &&
                            a.classId === selectedClass.id &&
                            a.week === wk
                        );
                        const wkPaid = state.payments
                          .filter(
                            (p) =>
                              p.status === 'confirmed' &&
                              p.studentId === stu.id &&
                              p.classId === selectedClass.id &&
                              p.week === wk &&
                              (currentUser?.role === 'owner' || p.collectorId === currentUser?.id)
                          )
                          .reduce((s, p) => s + p.amount, 0);

                        return (
                          <td
                            key={wk}
                            onClick={() => {
                              setSelectedWeek(wk);
                              setViewMode('weekly');
                            }}
                            className="py-2.5 px-2 text-center cursor-pointer hover:bg-mist/40"
                          >
                            {att ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge
                                  tone={
                                    att.status === 'P'
                                      ? 'sage'
                                      : att.status === 'A'
                                        ? 'terracotta'
                                        : att.status === 'E'
                                          ? 'amber'
                                          : 'slate'
                                  }
                                >
                                  {t(`attShort_${att.status}` as TranslationKey)}
                                </Badge>
                                {wkPaid > 0 && (
                                  <span className="text-[11px] font-medium text-charcoal tabular-nums">
                                    ${wkPaid}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-softgray/50">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right font-semibold text-charcoal tabular-nums">
                        {formatCurrencyExact(fin.remainingBalance, state.language)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quick Payment Modal */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title={
          state.language === 'es'
            ? `Cobrar Pago — Semana ${selectedWeek}`
            : `Collect Payment — Week ${selectedWeek}`
        }
        subtitle={payTarget?.fullName}
      >
        <form onSubmit={handleQuickPaySubmit} className="space-y-4">
          {payError && (
            <div className="p-3 rounded-lg bg-status-redBg text-status-red text-xs">
              {payError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-charcoal">{t('amount')} ($)</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-hairline bg-porcelain text-base font-semibold tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">{t('paymentMethod')}</span>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-hairline bg-porcelain"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`method_${m}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">{t('notes')}</span>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder={state.language === 'es' ? 'Nota opcional...' : 'Optional note...'}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPayTarget(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
