import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Search,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  formatCurrency,
  getStudentFinancialSummary,
} from '../../calculations/paymentEngine';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { AcademyClass, Weekday } from '../../types';

const WEEKDAYS: Weekday[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const ClassesPage: React.FC = () => {
  const { state, createClass, updateClass, t } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [weekdayFilter, setWeekdayFilter] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    searchParams.get('classId')
  );
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const cid = searchParams.get('classId');
    if (cid) setSelectedClassId(cid);
  }, [searchParams]);

  const instructors = useMemo(
    () => state.users.filter((u) => u.role === 'instructor' || u.role === 'owner'),
    [state.users]
  );

  const [form, setForm] = useState({
    name: '',
    program: 'Nail Technician Foundations',
    weekday: 'Saturday' as Weekday,
    startDate: '2026-12-05',
    weeks: 6,
    instructorIds: ['user-marisol'],
    defaultCourseTotal: 250,
    defaultDeposit: 50,
    defaultFirstClassPayment: 50,
  });
  const [formError, setFormError] = useState('');

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.classes.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (weekdayFilter !== 'all' && c.weekday !== weekdayFilter) return false;
      if (q) {
        return (
          c.name.toLowerCase().includes(q) ||
          c.program.toLowerCase().includes(q) ||
          c.weekday.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.classes, search, statusFilter, weekdayFilter]);

  const selectedClass: AcademyClass | null = useMemo(
    () => state.classes.find((c) => c.id === selectedClassId) ?? null,
    [state.classes, selectedClassId]
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createClass({
      name: form.name.trim(),
      program: form.program.trim(),
      weekday: form.weekday,
      startDate: form.startDate,
      weeks: Number(form.weeks),
      currentWeek: 1,
      instructorIds: form.instructorIds,
      status: 'active',
      defaultCourseTotal: Number(form.defaultCourseTotal),
      defaultDeposit: Number(form.defaultDeposit),
      defaultFirstClassPayment: Number(form.defaultFirstClassPayment),
    });
    if (!res.ok) {
      setFormError(res.error ?? 'Could not create class.');
      return;
    }
    setFormError('');
    setCreateOpen(false);
    setForm({
      name: '',
      program: 'Nail Technician Foundations',
      weekday: 'Saturday',
      startDate: '2026-12-05',
      weeks: 6,
      instructorIds: ['user-marisol'],
      defaultCourseTotal: 250,
      defaultDeposit: 50,
      defaultFirstClassPayment: 50,
    });
  };

  const toggleInstructor = (id: string) => {
    setForm((prev) => ({
      ...prev,
      instructorIds: prev.instructorIds.includes(id)
        ? prev.instructorIds.filter((x) => x !== id)
        : [...prev.instructorIds, id],
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_classes')}
        phase={t('phase1')}
        subtitle={
          state.language === 'es'
            ? 'Administración de programas, horarios semanales, instructoras asignadas y avance de grupos.'
            : 'Manage academy programs, weekly schedules, instructor assignments, and cohort progress.'
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {state.language === 'es' ? 'Crear Clase' : 'Create Class'}
          </Button>
        }
      />

      {/* Search & Filters */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-softgray absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              state.language === 'es'
                ? 'Buscar clase o programa...'
                : 'Search class or program...'
            }
            className="w-full h-10 pl-9 pr-3 text-sm bg-porcelain border border-hairline rounded-lg focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed')}
          className="h-10 px-3 text-sm bg-porcelain border border-hairline rounded-lg"
        >
          <option value="all">{t('all')}</option>
          <option value="active">{state.language === 'es' ? 'Activas' : 'Active'}</option>
          <option value="completed">{state.language === 'es' ? 'Completadas' : 'Completed'}</option>
        </select>
        <select
          value={weekdayFilter}
          onChange={(e) => setWeekdayFilter(e.target.value)}
          className="h-10 px-3 text-sm bg-porcelain border border-hairline rounded-lg"
        >
          <option value="all">{state.language === 'es' ? 'Todos los días' : 'All weekdays'}</option>
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Card>

      {/* Class Cards Grid */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClasses.map((cls) => {
            const roster = state.students.filter((s) => s.classId === cls.id);
            const assignedNames = state.users
              .filter((u) => cls.instructorIds.includes(u.id))
              .map((u) => u.name)
              .join(', ');
            const totalExpected = roster.reduce((s, st) => s + st.courseTotal, 0);
            const totalCollected = roster.reduce(
              (s, st) =>
                s +
                getStudentFinancialSummary(st, cls, state.payments, state.deposits)
                  .totalPaid,
              0
            );
            const submittedWeeks = state.classLogSubmissions.filter(
              (sub) => sub.classId === cls.id
            ).length;

            return (
              <Card
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className="p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={cls.status === 'active' ? 'sage' : 'slate'}>
                        {cls.status === 'active'
                          ? state.language === 'es'
                            ? 'Activa'
                            : 'Active'
                          : state.language === 'es'
                            ? 'Completada'
                            : 'Completed'}
                      </Badge>
                      <h2 className="font-editorial text-2xl text-charcoal mt-2">
                        {cls.name}
                      </h2>
                      <p className="text-xs text-softgray mt-0.5">{cls.program}</p>
                    </div>
                    <Badge tone="champagne">
                      Week {cls.currentWeek} / {cls.weeks}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-hairline">
                    <div>
                      <div className="text-softgray">{state.language === 'es' ? 'Día / Inicio' : 'Day / Start'}</div>
                      <div className="font-medium text-charcoal mt-0.5">
                        {cls.weekday} · {cls.startDate}
                      </div>
                    </div>
                    <div>
                      <div className="text-softgray">{state.language === 'es' ? 'Instructora' : 'Instructor'}</div>
                      <div className="font-medium text-charcoal mt-0.5">{assignedNames}</div>
                    </div>
                    <div>
                      <div className="text-softgray">{state.language === 'es' ? 'Alumnas' : 'Enrolled'}</div>
                      <div className="font-medium text-charcoal mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-clay-dark" />
                        {roster.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-hairline flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs">
                    <span className="text-softgray">
                      {state.language === 'es' ? 'Cobranza:' : 'Collected:'}{' '}
                    </span>
                    <span className="font-semibold text-charcoal tabular-nums">
                      {formatCurrency(totalCollected, state.language)} /{' '}
                      {formatCurrency(totalExpected, state.language)}
                    </span>
                    <span className="text-softgray ml-2">
                      · {submittedWeeks}/{cls.weeks}{' '}
                      {state.language === 'es' ? 'logs' : 'weeks logged'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/class-log?classId=${cls.id}`);
                    }}
                  >
                    {t('nav_classLog')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Class Detail Drawer */}
      <Drawer
        open={Boolean(selectedClass)}
        onClose={() => {
          setSelectedClassId(null);
          if (searchParams.get('classId')) {
            searchParams.delete('classId');
            setSearchParams(searchParams);
          }
        }}
        title={selectedClass?.name ?? ''}
        subtitle={selectedClass ? `${selectedClass.program} · ${selectedClass.weekday}` : ''}
        widthClass="sm:max-w-2xl"
      >
        {selectedClass && (() => {
          const roster = state.students.filter((s) => s.classId === selectedClass.id);
          const classPayments = state.payments.filter(
            (p) => p.classId === selectedClass.id && p.status === 'confirmed'
          );
          const totalCollected = classPayments.reduce((s, p) => s + p.amount, 0);

          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge tone={selectedClass.status === 'active' ? 'sage' : 'slate'}>
                    {selectedClass.status}
                  </Badge>
                  <Badge tone="champagne">
                    <Calendar className="w-3 h-3" /> {selectedClass.startDate} ({selectedClass.weeks} wks)
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      updateClass(selectedClass.id, {
                        status: selectedClass.status === 'active' ? 'completed' : 'active',
                      })
                    }
                  >
                    {selectedClass.status === 'active'
                      ? state.language === 'es'
                        ? 'Marcar Completada'
                        : 'Mark Completed'
                      : state.language === 'es'
                        ? 'Reactivar'
                        : 'Reopen Class'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/app/class-log?classId=${selectedClass.id}`)}
                  >
                    {state.language === 'es' ? 'Abrir Registro' : 'Open Class Log'}
                  </Button>
                </div>
              </div>

              {/* Weekly Progress Grid */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-charcoal mb-3">
                  {state.language === 'es' ? 'Progreso por Semana' : 'Weekly Log Progress'}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Array.from({ length: selectedClass.weeks }, (_, i) => i + 1).map((wk) => {
                    const submitted = state.classLogSubmissions.some(
                      (s) => s.classId === selectedClass.id && s.week === wk
                    );
                    const wkCollected = classPayments
                      .filter((p) => p.week === wk)
                      .reduce((s, p) => s + p.amount, 0);
                    return (
                      <button
                        key={wk}
                        type="button"
                        onClick={() =>
                          navigate(`/app/class-log?classId=${selectedClass.id}&week=${wk}`)
                        }
                        className={`p-2.5 rounded-lg border text-center transition-colors ${
                          submitted
                            ? 'bg-status-greenBg/70 border-sage/40 text-charcoal'
                            : wk === selectedClass.currentWeek
                              ? 'bg-mist/60 border-clay text-charcoal'
                              : 'bg-porcelain border-hairline text-softgray'
                        }`}
                      >
                        <div className="text-xs font-semibold flex items-center justify-center gap-1">
                          W{wk}
                          {submitted && <CheckCircle2 className="w-3 h-3 text-status-green" />}
                        </div>
                        <div className="text-[11px] tabular-nums mt-1">
                          {formatCurrency(wkCollected, state.language)}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-hairline flex justify-between text-xs">
                  <span className="text-softgray">
                    {state.language === 'es' ? 'Total recaudado (incl. depósitos)' : 'Total Collected (incl. deposits)'}
                  </span>
                  <span className="font-semibold text-charcoal tabular-nums">
                    {formatCurrency(totalCollected, state.language)}
                  </span>
                </div>
              </Card>

              {/* Roster */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-charcoal mb-3">
                  {state.language === 'es' ? 'Lista de Alumnas' : 'Student Roster'} ({roster.length})
                </h3>
                <div className="divide-y divide-hairline">
                  {roster.map((stu) => {
                    const fin = getStudentFinancialSummary(
                      stu,
                      selectedClass,
                      state.payments,
                      state.deposits
                    );
                    return (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => navigate(`/app/students?studentId=${stu.id}`)}
                        className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-porcelain px-2 -mx-2 rounded-lg text-xs"
                      >
                        <div>
                          <div className="font-semibold text-charcoal">{stu.fullName}</div>
                          <div className="text-softgray">{stu.phone}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          <div className="font-semibold text-charcoal">
                            {formatCurrency(fin.totalPaid, state.language)} /{' '}
                            {formatCurrency(fin.courseTotal, state.language)}
                          </div>
                          <div className="text-softgray">
                            {state.language === 'es' ? 'Saldo:' : 'Bal:'}{' '}
                            {formatCurrency(fin.remainingBalance, state.language)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          );
        })()}
      </Drawer>

      {/* Create Class Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={state.language === 'es' ? 'Crear Nueva Clase' : 'Create New Class'}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-status-redBg text-status-red text-xs">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-charcoal">
                {state.language === 'es' ? 'Nombre de la Clase *' : 'Class Name *'}
              </span>
              <input
                type="text"
                required
                placeholder="Saturday Nail Art Foundations"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-charcoal">
                {state.language === 'es' ? 'Programa *' : 'Program *'}
              </span>
              <input
                type="text"
                required
                value={form.program}
                onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">
                {state.language === 'es' ? 'Día de la semana' : 'Weekday'}
              </span>
              <select
                value={form.weekday}
                onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value as Weekday }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">
                {state.language === 'es' ? 'Fecha de inicio *' : 'Start Date *'}
              </span>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">
                {state.language === 'es' ? 'Duración (semanas) *' : 'Duration (weeks) *'}
              </span>
              <input
                type="number"
                min={1}
                max={24}
                required
                value={form.weeks}
                onChange={(e) => setForm((f) => ({ ...f, weeks: Number(e.target.value) }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">{t('courseTotal')} ($)</span>
              <input
                type="number"
                min={50}
                value={form.defaultCourseTotal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultCourseTotal: Number(e.target.value) }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
          </div>
          <div>
            <span className="text-xs font-medium text-charcoal block mb-1.5">
              {state.language === 'es' ? 'Instructoras Asignadas *' : 'Assigned Instructors *'}
            </span>
            <div className="flex flex-wrap gap-2">
              {instructors.map((inst) => {
                const active = form.instructorIds.includes(inst.id);
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggleInstructor(inst.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-olive text-white border-olive'
                        : 'bg-porcelain text-charcoal border-hairline'
                    }`}
                  >
                    {inst.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('create')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
