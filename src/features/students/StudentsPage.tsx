import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  CheckCircle2,
  Circle,
  Download,
  DollarSign,
  Edit3,
  Star,
  KeyRound,
  UserPlus,
  FileText,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  canEnrollOrEditStudent,
  canRecordPayment,
  canTakeDeposit,
  canViewBehindSchedule,
  canViewStudent,
  canViewStudentFinancials,
} from '../../permissions/permissions';
import {
  formatCurrency,
  formatCurrencyExact,
  getStudentFinancialSummary,
} from '../../calculations/paymentEngine';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import { generateReceiptPdf } from '../../services/pdfExport';
import type { EnrollmentChecklist, PaymentMethod, Student } from '../../types';
import type { TranslationKey } from '../../translations/dictionary';

type StudentFilter =
  | 'all_current'
  | 'pending'
  | 'enrolled'
  | 'school_pending'
  | 'no_review'
  | 'completed_dropped';

const METHODS: PaymentMethod[] = [
  'cash',
  'card',
  'zelle',
  'venmo',
  'cash_app',
  'check',
  'other',
];

export const StudentsPage: React.FC = () => {
  const {
    state,
    currentUser,
    createStudent,
    updateStudent,
    toggleChecklistItem,
    createPayment,
    createDeposit,
    t,
  } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState<StudentFilter>('all_current');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    searchParams.get('studentId')
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [payModalMode, setPayModalMode] = useState<'payment' | 'deposit' | null>(null);

  useEffect(() => {
    const paramId = searchParams.get('studentId');
    if (paramId) setSelectedStudentId(paramId);
  }, [searchParams]);

  const visibleStudents = useMemo(() => {
    if (!currentUser) return [];
    return state.students.filter((s) => canViewStudent(currentUser, s));
  }, [state.students, currentUser]);

  const canSeeMoney = currentUser
    ? canViewStudentFinancials(currentUser, state.policy)
    : false;
  const canSeeBehind = currentUser ? canViewBehindSchedule(currentUser) : false;
  const canEdit = currentUser ? canEnrollOrEditStudent(currentUser) : false;

  const summaryMetrics = useMemo(() => {
    const active = visibleStudents.filter(
      (s) => s.enrollmentStatus === 'enrolled' || s.enrollmentStatus === 'pending'
    );
    const schoolPending = active.filter((s) => !s.schoolAccess).length;
    const reviews = active.filter((s) => s.googleReview).length;
    const enrolledThisMonth = visibleStudents.filter(
      (s) => s.enrollmentDate >= '2026-11-01'
    ).length;
    return {
      activeCount: active.length,
      schoolPending,
      reviews,
      enrolledThisMonth,
    };
  }, [visibleStudents]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleStudents.filter((s) => {
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      if (filter === 'all_current' && (s.enrollmentStatus === 'completed' || s.enrollmentStatus === 'dropped')) return false;
      if (filter === 'pending' && s.enrollmentStatus !== 'pending') return false;
      if (filter === 'enrolled' && s.enrollmentStatus !== 'enrolled') return false;
      if (filter === 'school_pending' && s.schoolAccess) return false;
      if (filter === 'no_review' && s.googleReview) return false;
      if (filter === 'completed_dropped' && s.enrollmentStatus !== 'completed' && s.enrollmentStatus !== 'dropped') return false;

      if (q) {
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [visibleStudents, classFilter, filter, search]);

  const selectedStudent = useMemo(
    () => visibleStudents.find((s) => s.id === selectedStudentId) ?? null,
    [visibleStudents, selectedStudentId]
  );

  // Create student form state
  const [newForm, setNewForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    classId: state.classes[0]?.id ?? 'class-tue-nails',
    courseTotal: 250,
    depositExpected: 50,
    firstClassPayment: 50,
    fixedWeeklyAmount: '',
    source: 'Studio Tour',
    accommodations: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Edit form state
  const [editDraft, setEditDraft] = useState<Partial<Student>>({});

  // Quick payment / deposit form state
  const [payForm, setPayForm] = useState({
    amount: '',
    method: 'cash' as PaymentMethod,
    week: 4,
    date: '2026-11-24',
    notes: '',
  });
  const [payError, setPayError] = useState('');

  const handleClassChangeInCreate = (classId: string) => {
    const cls = state.classes.find((c) => c.id === classId);
    setNewForm((prev) => ({
      ...prev,
      classId,
      courseTotal: cls?.defaultCourseTotal ?? prev.courseTotal,
      depositExpected: cls?.defaultDeposit ?? prev.depositExpected,
      firstClassPayment: cls?.defaultFirstClassPayment ?? prev.firstClassPayment,
    }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cls = state.classes.find((c) => c.id === newForm.classId);
    const res = createStudent({
      fullName: newForm.fullName.trim(),
      phone: newForm.phone.trim(),
      email: newForm.email.trim(),
      program: cls?.program ?? 'Nail Technician Foundations',
      classId: newForm.classId,
      courseTotal: Number(newForm.courseTotal),
      depositExpected: Number(newForm.depositExpected),
      firstClassPayment: Number(newForm.firstClassPayment),
      fixedWeeklyAmount: newForm.fixedWeeklyAmount
        ? Number(newForm.fixedWeeklyAmount)
        : null,
      enrollmentDate: '2026-11-24',
      schoolAccess: false,
      googleReview: false,
      source: newForm.source,
      accommodations: newForm.accommodations.trim(),
      notes: newForm.notes.trim(),
    });
    if (!res.ok) {
      setFormError(res.error ?? 'Could not create student.');
      return;
    }
    setFormError('');
    setCreateOpen(false);
    setNewForm({
      fullName: '',
      phone: '',
      email: '',
      classId: state.classes[0]?.id ?? 'class-tue-nails',
      courseTotal: 250,
      depositExpected: 50,
      firstClassPayment: 50,
      fixedWeeklyAmount: '',
      source: 'Studio Tour',
      accommodations: '',
      notes: '',
    });
    if (res.data) setSelectedStudentId(res.data.id);
  };

  const openPayModal = (mode: 'payment' | 'deposit', stu: Student) => {
    const cls = state.classes.find((c) => c.id === stu.classId);
    const fin = getStudentFinancialSummary(stu, cls, state.payments, state.deposits);
    setPayForm({
      amount: String(mode === 'deposit' ? stu.depositExpected : fin.dueThisWeek || fin.weeklyScheduledAmount),
      method: 'cash',
      week: cls?.currentWeek ?? 1,
      date: '2026-11-24',
      notes: '',
    });
    setPayError('');
    setPayModalMode(mode);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !payModalMode) return;
    const amt = Number(payForm.amount);
    if (payModalMode === 'deposit') {
      const res = createDeposit({
        studentId: selectedStudent.id,
        classId: selectedStudent.classId,
        amount: amt,
        method: payForm.method,
        date: payForm.date,
        notes: payForm.notes,
      });
      if (!res.ok) {
        setPayError(res.error ?? 'Invalid deposit.');
        return;
      }
    } else {
      const res = createPayment({
        studentId: selectedStudent.id,
        classId: selectedStudent.classId,
        week: Number(payForm.week),
        date: payForm.date,
        amount: amt,
        method: payForm.method,
        category: Number(payForm.week) === 1 ? 'first_class' : 'weekly',
        notes: payForm.notes,
      });
      if (!res.ok) {
        setPayError(res.error ?? 'Invalid payment.');
        return;
      }
    }
    setPayModalMode(null);
  };

  const checklistProgress = (c: EnrollmentChecklist) =>
    [
      c.depositConfirmed,
      c.webSubscriptionConfirmed,
      c.welcomeEmailSent,
      c.attendanceConfirmedBySidney,
    ].filter(Boolean).length;

  const statusTone = (status: Student['enrollmentStatus']) => {
    if (status === 'enrolled') return 'sage';
    if (status === 'pending') return 'amber';
    if (status === 'completed') return 'navy';
    return 'terracotta';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_students')}
        phase={t('phase1')}
        subtitle={
          state.language === 'es'
            ? 'CRM de alumnas inscritas de La Voute Beauty Academy (los prospectos se gestionan en HubSpot).'
            : 'Enrolled student roster for La Voute Beauty Academy (unconverted leads remain in HubSpot).'
        }
        actions={
          canEdit && (
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="w-4 h-4" />
              {state.language === 'es' ? 'Inscribir Alumna' : 'Enroll Student'}
            </Button>
          )
        }
      />

      {/* Policy Notice for Telemarketing */}
      {currentUser?.role === 'telemarketing' && !state.policy.telemarketingCanSeeBalances && (
        <div className="px-4 py-3 rounded-xl bg-champagne-light/60 border border-champagne/40 text-xs text-navy flex items-center justify-between gap-3">
          <span>
            {state.language === 'es'
              ? 'Política activa: los saldos detallados están ocultos para Telemercadeo (configurable por propietarios en Equipo y Accesos).'
              : 'Active Policy: Detailed payment balances are hidden for Telemarketing (configurable by Owners under Team & Access).'}
          </span>
          <Badge tone="champagne">{state.language === 'es' ? 'Política Demo' : 'Configurable Policy'}</Badge>
        </div>
      )}

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label={t('kpiActiveStudents')}
          value={summaryMetrics.activeCount}
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          label={state.language === 'es' ? 'Portal Escolar Pendiente' : 'School Access Pending'}
          value={summaryMetrics.schoolPending}
          tone={summaryMetrics.schoolPending > 0 ? 'amber' : 'sage'}
          icon={<KeyRound className="w-4 h-4" />}
        />
        <KpiCard
          label={state.language === 'es' ? 'Reseñas Google' : 'Google Reviews'}
          value={`${summaryMetrics.reviews} / ${summaryMetrics.activeCount}`}
          tone="sage"
          icon={<Star className="w-4 h-4" />}
        />
        <KpiCard
          label={state.language === 'es' ? 'Inscritas Este Mes' : 'Enrolled This Month'}
          value={summaryMetrics.enrolledThisMonth}
          icon={<UserPlus className="w-4 h-4" />}
        />
      </div>

      {/* Filters & Search */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slatewarm absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                state.language === 'es'
                  ? 'Buscar por nombre, teléfono o correo...'
                  : 'Search by name, phone, or email...'
              }
              className="w-full h-10 pl-9 pr-3 text-sm bg-porcelain border border-borderwarm rounded-lg focus:bg-white focus:border-champagne"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
            className="h-10 px-3 text-sm bg-porcelain border border-borderwarm rounded-lg text-navy"
          >
            <option value="all">
              {state.language === 'es' ? 'Todas las clases' : 'All classes'}
            </option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ['all_current', state.language === 'es' ? 'Todas activas' : 'All current'],
              ['pending', t('status_pending')],
              ['enrolled', t('status_enrolled')],
              ['school_pending', state.language === 'es' ? 'Portal pendiente' : 'School pending'],
              ['no_review', state.language === 'es' ? 'Sin reseña' : 'No review yet'],
              ['completed_dropped', state.language === 'es' ? 'Completadas / Baja' : 'Completed / Dropped'],
            ] as [StudentFilter, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === val
                  ? 'bg-navy text-white border-navy'
                  : 'bg-porcelain text-slatewarm border-borderwarm hover:text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Listing: Desktop Table + Mobile Cards */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilter('all_current');
                setClassFilter('all');
                setSearch('');
              }}
            >
              {t('resetFilters')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-porcelain/80 border-b border-borderwarm text-[11px] font-semibold uppercase tracking-wider text-slatewarm">
                    <th className="py-3 px-4">{state.language === 'es' ? 'Alumna' : 'Student'}</th>
                    <th className="py-3 px-4">{state.language === 'es' ? 'Clase' : 'Class'}</th>
                    <th className="py-3 px-4">{t('status')}</th>
                    <th className="py-3 px-4">{state.language === 'es' ? 'Checklist' : 'Checklist'}</th>
                    {canSeeMoney && (
                      <>
                        <th className="py-3 px-4 text-right">{t('courseTotal')}</th>
                        <th className="py-3 px-4 text-right">{t('totalPaid')}</th>
                        <th className="py-3 px-4 text-right">{t('remainingBalance')}</th>
                      </>
                    )}
                    {canSeeBehind && (
                      <th className="py-3 px-4 text-right">{t('behindSchedule')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderwarm text-sm">
                  {filteredStudents.map((stu) => {
                    const cls = state.classes.find((c) => c.id === stu.classId);
                    const fin = getStudentFinancialSummary(
                      stu,
                      cls,
                      state.payments,
                      state.deposits
                    );
                    const checks = checklistProgress(stu.checklist);
                    return (
                      <tr
                        key={stu.id}
                        onClick={() => {
                          setSelectedStudentId(stu.id);
                          setEditMode(false);
                        }}
                        className="hover:bg-porcelain/70 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-navy">{stu.fullName}</div>
                          <div className="text-xs text-slatewarm">{stu.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-navy">{cls?.name}</div>
                          <div className="text-[11px] text-slatewarm">{stu.program}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge tone={statusTone(stu.enrollmentStatus)}>
                            {t(`status_${stu.enrollmentStatus}` as TranslationKey)}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-ivory overflow-hidden">
                              <div
                                className="h-full bg-champagne rounded-full"
                                style={{ width: `${(checks / 4) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slatewarm tabular-nums">
                              {checks}/4
                            </span>
                          </div>
                        </td>
                        {canSeeMoney && (
                          <>
                            <td className="py-3.5 px-4 text-right tabular-nums text-navy">
                              {formatCurrency(fin.courseTotal, state.language)}
                            </td>
                            <td className="py-3.5 px-4 text-right tabular-nums text-sage-dark font-medium">
                              {formatCurrency(fin.totalPaid, state.language)}
                            </td>
                            <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-navy">
                              {formatCurrency(fin.remainingBalance, state.language)}
                            </td>
                          </>
                        )}
                        {canSeeBehind && (
                          <td className="py-3.5 px-4 text-right tabular-nums">
                            {fin.behindSchedule > 0 ? (
                              <Badge tone="terracotta">
                                {formatCurrency(fin.behindSchedule, state.language)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-sage-dark">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredStudents.map((stu) => {
              const cls = state.classes.find((c) => c.id === stu.classId);
              const fin = getStudentFinancialSummary(
                stu,
                cls,
                state.payments,
                state.deposits
              );
              const checks = checklistProgress(stu.checklist);
              return (
                <Card
                  key={stu.id}
                  onClick={() => {
                    setSelectedStudentId(stu.id);
                    setEditMode(false);
                  }}
                  className="p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-navy text-sm truncate">
                        {stu.fullName}
                      </div>
                      <div className="text-xs text-slatewarm">{stu.phone}</div>
                    </div>
                    <Badge tone={statusTone(stu.enrollmentStatus)}>
                      {t(`status_${stu.enrollmentStatus}` as TranslationKey)}
                    </Badge>
                  </div>
                  <div className="text-xs text-slatewarm flex items-center justify-between">
                    <span>{cls?.name}</span>
                    <span>Checklist {checks}/4</span>
                  </div>
                  {canSeeMoney && (
                    <div className="pt-2 border-t border-borderwarm grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slatewarm">{t('totalPaid')}</div>
                        <div className="font-semibold text-sage-dark tabular-nums">
                          {formatCurrency(fin.totalPaid, state.language)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slatewarm">{t('remainingBalance')}</div>
                        <div className="font-semibold text-navy tabular-nums">
                          {formatCurrency(fin.remainingBalance, state.language)}
                        </div>
                      </div>
                      {canSeeBehind && (
                        <div className="text-right">
                          <div className="text-slatewarm">{t('behindSchedule')}</div>
                          <div
                            className={`font-semibold tabular-nums ${
                              fin.behindSchedule > 0 ? 'text-terracotta-dark' : 'text-sage-dark'
                            }`}
                          >
                            {fin.behindSchedule > 0
                              ? formatCurrency(fin.behindSchedule, state.language)
                              : '$0'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Student Profile Drawer */}
      <Drawer
        open={Boolean(selectedStudent)}
        onClose={() => {
          setSelectedStudentId(null);
          setEditMode(false);
          if (searchParams.get('studentId')) {
            searchParams.delete('studentId');
            setSearchParams(searchParams);
          }
        }}
        title={selectedStudent?.fullName ?? ''}
        subtitle={
          selectedStudent
            ? `${selectedStudent.program} · ${
                state.classes.find((c) => c.id === selectedStudent.classId)?.name ?? ''
              }`
            : ''
        }
        widthClass="sm:max-w-2xl"
      >
        {selectedStudent && (() => {
          const cls = state.classes.find((c) => c.id === selectedStudent.classId);
          const fin = getStudentFinancialSummary(
            selectedStudent,
            cls,
            state.payments,
            state.deposits
          );
          const studentPayments = state.payments.filter(
            (p) => p.studentId === selectedStudent.id
          );
          const studentDeposits = state.deposits.filter(
            (d) => d.studentId === selectedStudent.id
          );
          const studentAttendance = state.attendance
            .filter((a) => a.studentId === selectedStudent.id)
            .sort((a, b) => a.week - b.week);

          return (
            <div className="space-y-5">
              {/* Top Action Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={statusTone(selectedStudent.enrollmentStatus)}>
                    {t(`status_${selectedStudent.enrollmentStatus}` as TranslationKey)}
                  </Badge>
                  <Badge tone={selectedStudent.schoolAccess ? 'sage' : 'amber'}>
                    {selectedStudent.schoolAccess
                      ? state.language === 'es'
                        ? 'Portal Activo'
                        : 'School Access Active'
                      : state.language === 'es'
                        ? 'Portal Pendiente'
                        : 'School Access Pending'}
                  </Badge>
                  {selectedStudent.googleReview && (
                    <Badge tone="champagne">
                      ★ {state.language === 'es' ? 'Reseña Google' : 'Google Review'}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {currentUser && canRecordPayment(currentUser, selectedStudent) && (
                    <Button
                      size="sm"
                      onClick={() => openPayModal('payment', selectedStudent)}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      {state.language === 'es' ? 'Registrar Pago' : 'Record Payment'}
                    </Button>
                  )}
                  {currentUser && canTakeDeposit(currentUser) && (
                    <Button
                      size="sm"
                      variant="champagne"
                      onClick={() => openPayModal('deposit', selectedStudent)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {state.language === 'es' ? 'Tomar Depósito' : 'Take Deposit'}
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditDraft({
                          phone: selectedStudent.phone,
                          email: selectedStudent.email,
                          classId: selectedStudent.classId,
                          source: selectedStudent.source,
                          accommodations: selectedStudent.accommodations,
                          notes: selectedStudent.notes,
                          schoolAccess: selectedStudent.schoolAccess,
                          googleReview: selectedStudent.googleReview,
                        });
                        setEditMode((v) => !v);
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {t('edit')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Editable Profile Section */}
              {editMode && canEdit ? (
                <Card className="p-4 space-y-3 border-champagne/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <label className="block">
                      <span className="text-xs text-slatewarm">Phone</span>
                      <input
                        type="text"
                        value={editDraft.phone ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-borderwarm bg-porcelain"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slatewarm">Email</span>
                      <input
                        type="email"
                        value={editDraft.email ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-borderwarm bg-porcelain"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slatewarm">Class</span>
                      <select
                        value={editDraft.classId ?? selectedStudent.classId}
                        onChange={(e) => setEditDraft((d) => ({ ...d, classId: e.target.value }))}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-borderwarm bg-porcelain"
                      >
                        {state.classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-slatewarm">Source</span>
                      <input
                        type="text"
                        value={editDraft.source ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, source: e.target.value }))}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-borderwarm bg-porcelain"
                      />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="text-xs text-slatewarm">Accommodations</span>
                    <input
                      type="text"
                      value={editDraft.accommodations ?? ''}
                      onChange={(e) => setEditDraft((d) => ({ ...d, accommodations: e.target.value }))}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-borderwarm bg-porcelain"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-slatewarm">{t('notes')}</span>
                    <textarea
                      rows={2}
                      value={editDraft.notes ?? ''}
                      onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                      className="mt-1 w-full p-2.5 rounded-lg border border-borderwarm bg-porcelain"
                    />
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editDraft.schoolAccess)}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, schoolAccess: e.target.checked }))
                        }
                      />
                      <span>School Access Granted</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editDraft.googleReview)}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, googleReview: e.target.checked }))
                        }
                      />
                      <span>Google Review Completed</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditMode(false)}>
                      {t('cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateStudent(selectedStudent.id, editDraft);
                        setEditMode(false);
                      }}
                    >
                      {t('save')}
                    </Button>
                  </div>
                </Card>
              ) : (
                /* Overview Card */
                <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slatewarm">{state.language === 'es' ? 'Teléfono' : 'Phone'}</div>
                    <div className="font-medium text-navy mt-0.5">{selectedStudent.phone}</div>
                  </div>
                  <div>
                    <div className="text-slatewarm">{state.language === 'es' ? 'Correo' : 'Email'}</div>
                    <div className="font-medium text-navy mt-0.5">{selectedStudent.email}</div>
                  </div>
                  <div>
                    <div className="text-slatewarm">{state.language === 'es' ? 'Fuente / Inscrita por' : 'Source / Enrolled By'}</div>
                    <div className="font-medium text-navy mt-0.5">
                      {selectedStudent.source} · {selectedStudent.enrolledByName}
                    </div>
                  </div>
                  <div>
                    <div className="text-slatewarm">{state.language === 'es' ? 'Fecha de inscripción' : 'Enrollment Date'}</div>
                    <div className="font-medium text-navy mt-0.5">{selectedStudent.enrollmentDate}</div>
                  </div>
                  {selectedStudent.accommodations && (
                    <div className="sm:col-span-2 pt-2 border-t border-borderwarm">
                      <div className="text-slatewarm">{state.language === 'es' ? 'Acomodaciones' : 'Accommodations'}</div>
                      <div className="text-navy mt-0.5">{selectedStudent.accommodations}</div>
                    </div>
                  )}
                  {selectedStudent.notes && (
                    <div className="sm:col-span-2">
                      <div className="text-slatewarm">{t('notes')}</div>
                      <div className="text-navy mt-0.5">{selectedStudent.notes}</div>
                    </div>
                  )}
                </Card>
              )}

              {/* Enrollment 4-Step Checklist */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-navy">
                    {state.language === 'es'
                      ? 'Lista de Verificación de Inscripción (4 pasos)'
                      : 'Enrollment Checklist (4 Required Checks)'}
                  </h3>
                  <Badge tone={checklistProgress(selectedStudent.checklist) === 4 ? 'sage' : 'amber'}>
                    {checklistProgress(selectedStudent.checklist)} / 4
                  </Badge>
                </div>
                <div className="space-y-2">
                  {(
                    [
                      'depositConfirmed',
                      'webSubscriptionConfirmed',
                      'welcomeEmailSent',
                      'attendanceConfirmedBySidney',
                    ] as (keyof EnrollmentChecklist)[]
                  ).map((key) => {
                    const checked = selectedStudent.checklist[key];
                    const disabled =
                      !canEdit ||
                      (key === 'depositConfirmed' && currentUser?.role !== 'owner');
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleChecklistItem(selectedStudent.id, key)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-borderwarm bg-porcelain/50 hover:bg-porcelain text-left transition-colors disabled:opacity-70 disabled:cursor-default"
                      >
                        {checked ? (
                          <CheckCircle2 className="w-4 h-4 text-sage-dark shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slatewarm shrink-0" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            checked ? 'text-navy' : 'text-slatewarm'
                          }`}
                        >
                          {t(`check_${key}` as TranslationKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Financial Overview (authorized roles only) */}
              {canSeeMoney ? (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy">
                      {state.language === 'es' ? 'Resumen Financiero' : 'Financial Overview'}
                    </h3>
                    {selectedStudent.fixedWeeklyAmount ? (
                      <Badge tone="champagne">
                        {state.language === 'es' ? 'Plan Fijo' : 'Fixed Plan'}:{' '}
                        {formatCurrencyExact(selectedStudent.fixedWeeklyAmount, state.language)}/wk
                      </Badge>
                    ) : (
                      <Badge tone="slate">
                        {state.language === 'es' ? 'Plan Dinámico' : 'Dynamic Weekly Split'}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-porcelain">
                      <div className="text-slatewarm">{t('courseTotal')}</div>
                      <div className="text-base font-semibold text-navy tabular-nums mt-0.5">
                        {formatCurrencyExact(fin.courseTotal, state.language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-porcelain">
                      <div className="text-slatewarm">{t('totalPaid')}</div>
                      <div className="text-base font-semibold text-sage-dark tabular-nums mt-0.5">
                        {formatCurrencyExact(fin.totalPaid, state.language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-porcelain">
                      <div className="text-slatewarm">{t('remainingBalance')}</div>
                      <div className="text-base font-semibold text-navy tabular-nums mt-0.5">
                        {formatCurrencyExact(fin.remainingBalance, state.language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-porcelain">
                      <div className="text-slatewarm">{t('deposit')}</div>
                      <div className="text-sm font-semibold text-navy tabular-nums mt-0.5">
                        {formatCurrencyExact(fin.confirmedDeposit, state.language)}
                        {fin.pendingDeposit > 0 && (
                          <span className="text-amberwarm-dark block text-[11px]">
                            +{formatCurrency(fin.pendingDeposit, state.language)} pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-porcelain">
                      <div className="text-slatewarm">{t('dueThisWeek')}</div>
                      <div className="text-sm font-semibold text-navy tabular-nums mt-0.5">
                        {formatCurrencyExact(fin.dueThisWeek, state.language)}
                      </div>
                    </div>
                    {canSeeBehind && (
                      <div className="p-3 rounded-lg bg-porcelain">
                        <div className="text-slatewarm">{t('behindSchedule')}</div>
                        <div
                          className={`text-sm font-semibold tabular-nums mt-0.5 ${
                            fin.behindSchedule > 0 ? 'text-terracotta-dark' : 'text-sage-dark'
                          }`}
                        >
                          {formatCurrencyExact(fin.behindSchedule, state.language)}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-4 text-xs text-slatewarm">
                  {state.language === 'es'
                    ? 'Los detalles de saldos financieros están restringidos para este rol.'
                    : 'Detailed financial balances are restricted for this role.'}
                </Card>
              )}

              {/* Payment History & Receipts */}
              {canSeeMoney && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-champagne" />
                    {state.language === 'es'
                      ? 'Historial de Pagos y Recibos'
                      : 'Payment History & Receipts'}
                  </h3>

                  {studentDeposits.filter((d) => d.status === 'pending').length > 0 && (
                    <div className="mb-3 space-y-2">
                      {studentDeposits
                        .filter((d) => d.status === 'pending')
                        .map((dep) => (
                          <div
                            key={dep.id}
                            className="p-2.5 rounded-lg bg-amberwarm-light/60 border border-amberwarm/30 flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-semibold text-navy">
                                {dep.receiptNumber}
                              </span>{' '}
                              · {formatCurrencyExact(dep.amount, state.language)} ({t('pendingConfirmation')})
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                generateReceiptPdf({
                                  receiptNumber: dep.receiptNumber,
                                  student: selectedStudent,
                                  academyClass: cls,
                                  date: dep.date,
                                  amount: dep.amount,
                                  method: dep.method,
                                  collectorName: dep.collectorName,
                                  isConfirmed: false,
                                  categoryLabel: t('deposit'),
                                  notes: dep.notes,
                                  language: state.language,
                                })
                              }
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}

                  {studentPayments.length === 0 ? (
                    <p className="text-xs text-slatewarm">
                      {state.language === 'es'
                        ? 'Aún no hay pagos confirmados.'
                        : 'No confirmed payments recorded yet.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-borderwarm">
                      {studentPayments.map((p) => (
                        <div
                          key={p.id}
                          className="py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-navy">
                                {p.receiptNumber}
                              </span>
                              <span className="text-slatewarm">
                                {p.week === 0 ? t('deposit') : `Week ${p.week}`} · {p.date}
                              </span>
                            </div>
                            <div className="text-slatewarm mt-0.5">
                              {t(`method_${p.method}` as TranslationKey)} · {p.collectorName}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-navy tabular-nums">
                              {formatCurrencyExact(p.amount, state.language)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                generateReceiptPdf({
                                  receiptNumber: p.receiptNumber,
                                  student: selectedStudent,
                                  academyClass: cls,
                                  date: p.date,
                                  amount: p.amount,
                                  method: p.method,
                                  collectorName: p.collectorName,
                                  isConfirmed: p.status === 'confirmed',
                                  categoryLabel:
                                    p.category === 'deposit'
                                      ? t('deposit')
                                      : `Week ${p.week} Tuition`,
                                  notes: p.notes,
                                  language: state.language,
                                })
                              }
                              className="p-1.5 rounded-md border border-borderwarm hover:bg-ivory text-navy"
                              title="Download Receipt PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Attendance History */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-navy mb-3">
                  {state.language === 'es' ? 'Historial de Asistencia' : 'Attendance History'}
                </h3>
                {studentAttendance.length === 0 ? (
                  <p className="text-xs text-slatewarm">
                    {state.language === 'es'
                      ? 'Sin registros de asistencia aún.'
                      : 'No attendance sessions recorded yet.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {studentAttendance.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg border border-borderwarm bg-porcelain/60 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-navy">Week {att.week}</span>
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
                            {t(`att_${att.status}` as TranslationKey)}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slatewarm mt-1">{att.date}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        })()}
      </Drawer>

      {/* Enroll New Student Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={state.language === 'es' ? 'Inscribir Nueva Alumna' : 'Enroll New Student'}
        subtitle={
          state.language === 'es'
            ? 'La alumna inicia como Inscripción Pendiente hasta completar los 4 requisitos.'
            : 'Students begin in Pending Enrollment until all 4 checklist items are completed.'
        }
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-terracotta-light text-terracotta-dark text-xs">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-navy">
                {state.language === 'es' ? 'Nombre Completo *' : 'Full Name *'}
              </span>
              <input
                type="text"
                required
                value={newForm.fullName}
                onChange={(e) => setNewForm((f) => ({ ...f, fullName: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">
                {state.language === 'es' ? 'Teléfono *' : 'Phone *'}
              </span>
              <input
                type="tel"
                required
                value={newForm.phone}
                onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(323) 555-0199"
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">
                {state.language === 'es' ? 'Correo Electrónico *' : 'Email *'}
              </span>
              <input
                type="email"
                required
                value={newForm.email}
                onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain focus:bg-white"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-navy">
                {state.language === 'es' ? 'Clase Asignada *' : 'Assigned Class *'}
              </span>
              <select
                value={newForm.classId}
                onChange={(e) => handleClassChangeInCreate(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              >
                {state.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.program})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('courseTotal')} ($)</span>
              <input
                type="number"
                min={1}
                step="0.01"
                required
                value={newForm.courseTotal}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, courseTotal: Number(e.target.value) }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('deposit')} ($)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={newForm.depositExpected}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, depositExpected: Number(e.target.value) }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('firstClassPayment')} ($)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={newForm.firstClassPayment}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, firstClassPayment: Number(e.target.value) }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">
                {state.language === 'es' ? 'Cuota Fija Opcional ($)' : 'Optional Fixed Weekly ($)'}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder={state.language === 'es' ? 'Automático' : 'Auto dynamic'}
                value={newForm.fixedWeeklyAmount}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, fixedWeeklyAmount: e.target.value }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">
                {state.language === 'es' ? 'Fuente' : 'Enrollment Source'}
              </span>
              <select
                value={newForm.source}
                onChange={(e) => setNewForm((f) => ({ ...f, source: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              >
                <option value="Studio Tour">Studio Tour</option>
                <option value="Instagram DM">Instagram DM</option>
                <option value="TikTok">TikTok</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Google Search">Google Search</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">
                {state.language === 'es' ? 'Acomodaciones' : 'Accommodations'}
              </span>
              <input
                type="text"
                value={newForm.accommodations}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, accommodations: e.target.value }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('create')}</Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment or Deposit Modal from Student Profile */}
      <Modal
        open={Boolean(payModalMode && selectedStudent)}
        onClose={() => setPayModalMode(null)}
        title={
          payModalMode === 'deposit'
            ? state.language === 'es'
              ? 'Registrar Depósito (Pendiente de Confirmación)'
              : 'Record Deposit (Pending Owner Confirmation)'
            : state.language === 'es'
              ? 'Registrar Pago de Alumna'
              : 'Record Student Payment'
        }
        subtitle={selectedStudent?.fullName}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          {payError && (
            <div className="p-3 rounded-lg bg-terracotta-light text-terracotta-dark text-xs">
              {payError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('amount')} ($)</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('paymentMethod')}</span>
              <select
                value={payForm.method}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))
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
            {payModalMode === 'payment' && (
              <label className="block">
                <span className="text-xs font-medium text-navy">
                  {state.language === 'es' ? 'Semana' : 'Week'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={payForm.week}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, week: Number(e.target.value) }))
                  }
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('date')}</span>
              <input
                type="date"
                required
                value={payForm.date}
                onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">{t('notes')}</span>
            <input
              type="text"
              value={payForm.notes}
              onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPayModalMode(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
