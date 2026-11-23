import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Search, Calendar, UserCheck, Link2 } from 'lucide-react';
import { useApp } from '../../services/store';
import { canManageTours } from '../../permissions/permissions';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { StudioTour, TourOutcome } from '../../types';

const TODAY = '2026-11-24';

export const StudioToursPage: React.FC = () => {
  const { state, currentUser, createTour, updateTour, t } = useApp();
  const navigate = useNavigate();

  const canManage = currentUser ? canManageTours(currentUser) : false;

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | TourOutcome>('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<StudioTour | null>(null);

  const [form, setForm] = useState({
    visitorName: '',
    phone: '',
    email: '',
    date: '2026-11-26',
    time: '13:00',
    programInterest: 'Nail Technician Foundations',
    assignedStaffId: 'user-lizy',
    notes: '',
    linkedStudentId: '',
  });

  // Derived metrics per PRD Section 18.1
  const metrics = useMemo(() => {
    const total = state.tours.length;
    const todayCount = state.tours.filter((tr) => tr.date === TODAY).length;
    const upcomingCount = state.tours.filter((tr) => tr.date > TODAY).length;
    const concluded = state.tours.filter((tr) => tr.outcome !== 'pending');
    const showed = concluded.filter(
      (tr) => tr.outcome === 'arrived' || tr.outcome === 'enrolled'
    ).length;
    const enrolled = state.tours.filter((tr) => tr.outcome === 'enrolled').length;
    const noShows = state.tours.filter((tr) => tr.outcome === 'no_show').length;
    const showRate =
      concluded.length > 0 ? Math.round((showed / concluded.length) * 100) : 0;
    const enrollRate =
      showed > 0 ? Math.round((enrolled / showed) * 100) : 0;

    return { total, todayCount, upcomingCount, showRate, enrollRate, noShows };
  }, [state.tours]);

  const filteredTours = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.tours
      .filter((tr) => (outcomeFilter === 'all' ? true : tr.outcome === outcomeFilter))
      .filter((tr) =>
        programFilter === 'all' ? true : tr.programInterest === programFilter
      )
      .filter((tr) => {
        if (!q) return true;
        return (
          tr.visitorName.toLowerCase().includes(q) ||
          tr.phone.toLowerCase().includes(q) ||
          tr.programInterest.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  }, [state.tours, outcomeFilter, programFilter, search]);

  const openCreate = () => {
    setEditingTour(null);
    setForm({
      visitorName: '',
      phone: '',
      email: '',
      date: '2026-11-26',
      time: '13:00',
      programInterest: 'Nail Technician Foundations',
      assignedStaffId: currentUser?.id ?? 'user-lizy',
      notes: '',
      linkedStudentId: '',
    });
    setModalOpen(true);
  };

  const openEdit = (tour: StudioTour) => {
    setEditingTour(tour);
    setForm({
      visitorName: tour.visitorName,
      phone: tour.phone,
      email: tour.email,
      date: tour.date,
      time: tour.time,
      programInterest: tour.programInterest,
      assignedStaffId: tour.assignedStaffId,
      notes: tour.notes,
      linkedStudentId: tour.linkedStudentId ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = state.users.find((u) => u.id === form.assignedStaffId);
    if (editingTour) {
      updateTour(editingTour.id, {
        ...form,
        assignedStaffName: staff?.name ?? editingTour.assignedStaffName,
        linkedStudentId: form.linkedStudentId || undefined,
      });
    } else {
      createTour({
        visitorName: form.visitorName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        date: form.date,
        time: form.time,
        programInterest: form.programInterest,
        assignedStaffId: form.assignedStaffId,
        assignedStaffName: staff?.name ?? 'Lizy Amador',
        outcome: 'pending',
        notes: form.notes.trim(),
      });
    }
    setModalOpen(false);
  };

  const outcomeTone = (o: TourOutcome) => {
    if (o === 'enrolled') return 'sage';
    if (o === 'arrived') return 'champagne';
    if (o === 'no_show') return 'terracotta';
    return 'amber';
  };

  const outcomeLabel = (o: TourOutcome) => {
    if (state.language === 'es') {
      if (o === 'pending') return 'Pendiente';
      if (o === 'arrived') return 'Asistió';
      if (o === 'no_show') return 'No Asistió';
      return 'Inscrita';
    }
    if (o === 'pending') return 'Pending';
    if (o === 'arrived') return 'Arrived';
    if (o === 'no_show') return 'No Show';
    return 'Enrolled';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_tours')}
        phase={t('phase2')}
        subtitle={
          state.language === 'es'
            ? 'Agenda de visitas al estudio, asistencia y conversión a inscripción.'
            : 'Studio tour appointments, show rate tracking, and conversion to enrollment.'
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-hairline bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  viewMode === 'list' ? 'bg-olive text-white' : 'text-softgray'
                }`}
              >
                {state.language === 'es' ? 'Lista' : 'List'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  viewMode === 'calendar' ? 'bg-olive text-white' : 'text-softgray'
                }`}
              >
                {state.language === 'es' ? 'Calendario' : 'Calendar'}
              </button>
            </div>
            {canManage && (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                {state.language === 'es' ? 'Agendar Visita' : 'Book Tour'}
              </Button>
            )}
          </div>
        }
      />

      {/* 6 Derived KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label={state.language === 'es' ? 'Agendadas' : 'Tours Booked'} value={metrics.total} />
        <KpiCard label={state.language === 'es' ? 'Hoy' : "Today's Tours"} value={metrics.todayCount} tone="default" />
        <KpiCard label={state.language === 'es' ? 'Próximas' : 'Upcoming'} value={metrics.upcomingCount} />
        <KpiCard label={state.language === 'es' ? 'Asistencia' : 'Show Rate'} value={`${metrics.showRate}%`} tone="sage" />
        <KpiCard label={state.language === 'es' ? 'Conversión' : 'Enroll Rate'} value={`${metrics.enrollRate}%`} tone="sage" />
        <KpiCard label={state.language === 'es' ? 'Faltas' : 'No-Shows'} value={metrics.noShows} tone="terracotta" />
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-softgray absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={state.language === 'es' ? 'Buscar visitante o programa...' : 'Search visitor or program...'}
            className="w-full h-10 pl-9 pr-3 text-sm bg-porcelain border border-hairline rounded-lg"
          />
        </div>
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value as 'all' | TourOutcome)}
          className="h-10 px-3 text-sm bg-porcelain border border-hairline rounded-lg"
        >
          <option value="all">{t('all')}</option>
          <option value="pending">{outcomeLabel('pending')}</option>
          <option value="arrived">{outcomeLabel('arrived')}</option>
          <option value="enrolled">{outcomeLabel('enrolled')}</option>
          <option value="no_show">{outcomeLabel('no_show')}</option>
        </select>
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          className="h-10 px-3 text-sm bg-porcelain border border-hairline rounded-lg"
        >
          <option value="all">{state.language === 'es' ? 'Todos los programas' : 'All programs'}</option>
          <option value="Nail Technician Foundations">Nail Technician Foundations</option>
          <option value="Acrylic & Gel Artistry">Acrylic & Gel Artistry</option>
        </select>
      </Card>

      {/* Tours Listing or Calendar Schedule View */}
      {filteredTours.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
        />
      ) : viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(new Set(filteredTours.map((tr) => tr.date)))
            .sort()
            .map((dateStr) => {
              const dayTours = filteredTours.filter((tr) => tr.date === dateStr);
              return (
                <Card key={dateStr} className="overflow-hidden">
                  <div className="px-4 py-3 bg-mist/60 border-b border-hairline flex items-center justify-between">
                    <span className="font-semibold text-sm text-charcoal tabular-nums">
                      {dateStr}
                    </span>
                    <Badge tone={dateStr === TODAY ? 'olive' : 'gray'}>
                      {dateStr === TODAY
                        ? state.language === 'es'
                          ? 'Hoy'
                          : 'Today'
                        : `${dayTours.length} tour${dayTours.length > 1 ? 's' : ''}`}
                    </Badge>
                  </div>
                  <div className="divide-y divide-hairline">
                    {dayTours.map((tr) => (
                      <div key={tr.id} className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-charcoal">
                            {tr.time} · {tr.visitorName}
                          </span>
                          <Badge tone={outcomeTone(tr.outcome)}>
                            {outcomeLabel(tr.outcome)}
                          </Badge>
                        </div>
                        <div className="text-xs text-softgray">
                          {tr.programInterest} · {tr.assignedStaffName}
                        </div>
                        {canManage && (
                          <div className="pt-1 flex justify-end">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(tr)}>
                              {t('edit')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTours.map((tour) => {
            const isPastPending = tour.date < TODAY && tour.outcome === 'pending';
            const linkedStu = tour.linkedStudentId
              ? state.students.find((s) => s.id === tour.linkedStudentId)
              : null;

            return (
              <Card
                key={tour.id}
                className={`p-4 sm:p-5 ${isPastPending ? 'border-status-amber/60 bg-status-amberBg/20' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-charcoal text-sm">
                        {tour.visitorName}
                      </span>
                      <Badge tone={outcomeTone(tour.outcome)}>
                        {outcomeLabel(tour.outcome)}
                      </Badge>
                      {tour.date === TODAY && (
                        <Badge tone="navy">{state.language === 'es' ? 'Hoy' : 'Today'}</Badge>
                      )}
                      {isPastPending && (
                        <Badge tone="terracotta">
                          {state.language === 'es' ? 'Sin resultado' : 'Needs Outcome'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-softgray flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-charcoal">
                        <Calendar className="w-3.5 h-3.5 text-clay-dark" />
                        {tour.date} · {tour.time}
                      </span>
                      <span>{tour.programInterest}</span>
                      <span>{tour.phone}</span>
                      <span>
                        <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                        {tour.assignedStaffName}
                      </span>
                    </div>
                    {tour.notes && <p className="text-xs text-softgray">{tour.notes}</p>}
                    {linkedStu && (
                      <button
                        type="button"
                        onClick={() => navigate(`/app/students?studentId=${linkedStu.id}`)}
                        className="text-xs text-clay-dark hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Linked student: {linkedStu.fullName}
                      </button>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <select
                        value={tour.outcome}
                        aria-label={`Outcome for ${tour.visitorName}`}
                        onChange={(e) =>
                          updateTour(tour.id, { outcome: e.target.value as TourOutcome })
                        }
                        className="h-9 px-2.5 text-xs rounded-lg border border-hairline bg-porcelain text-charcoal font-medium"
                      >
                        <option value="pending">{outcomeLabel('pending')}</option>
                        <option value="arrived">{outcomeLabel('arrived')}</option>
                        <option value="enrolled">{outcomeLabel('enrolled')}</option>
                        <option value="no_show">{outcomeLabel('no_show')}</option>
                      </select>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(tour)}>
                        {t('edit')}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Book / Edit Tour Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingTour
            ? state.language === 'es'
              ? 'Editar / Reagendar Visita'
              : 'Edit / Reschedule Tour'
            : state.language === 'es'
              ? 'Agendar Nueva Visita'
              : 'Book New Studio Tour'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-charcoal">
                {state.language === 'es' ? 'Nombre del Visitante *' : 'Visitor Name *'}
              </span>
              <input
                type="text"
                required
                value={form.visitorName}
                onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Phone *</span>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">{t('date')} *</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Time *</span>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Program Interest</span>
              <select
                value={form.programInterest}
                onChange={(e) => setForm((f) => ({ ...f, programInterest: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              >
                <option value="Nail Technician Foundations">Nail Technician Foundations</option>
                <option value="Acrylic & Gel Artistry">Acrylic & Gel Artistry</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Assigned Staff</span>
              <select
                value={form.assignedStaffId}
                onChange={(e) => setForm((f) => ({ ...f, assignedStaffId: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
              >
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            {editingTour && (
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-charcoal">
                  Link to Enrolled Student (Optional)
                </span>
                <select
                  value={form.linkedStudentId}
                  onChange={(e) => setForm((f) => ({ ...f, linkedStudentId: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
                >
                  <option value="">None</option>
                  {state.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">{t('notes')}</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full p-2.5 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
