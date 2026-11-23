import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  GraduationCap,
  MapPin,
  Users,
  Lock,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useApp } from '../../services/store';
import { canViewMeeting } from '../../permissions/permissions';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  time: string;
  layer: 'class' | 'tour' | 'meeting' | 'owner_meeting';
  location?: string;
  description?: string;
  attendees?: string[];
}

export const CalendarPage: React.FC = () => {
  const { state, currentUser, createMeeting, t } = useApp();

  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 10, 1)); // Nov 2026
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    date: '2026-11-28',
    startTime: '10:00',
    endTime: '11:00',
    location: 'City Terrace Studio',
    attendeeIds: [currentUser?.id ?? 'user-rudy'],
    description: '',
    visibility: 'invited' as 'invited' | 'owner_only',
  });

  // Build unified calendar events across all 4 layers
  const events = useMemo(() => {
    if (!currentUser) return [];
    const list: CalendarEvent[] = [];

    // 1. Class Days
    state.classes.forEach((cls) => {
      try {
        const start = parseISO(cls.startDate);
        for (let w = 0; w < cls.weeks; w++) {
          const d = format(addDays(start, w * 7), 'yyyy-MM-dd');
          list.push({
            id: `ev-cls-${cls.id}-${w + 1}`,
            date: d,
            title: `${cls.name} (W${w + 1})`,
            time: '18:00',
            layer: 'class',
            location: 'Training Studio',
            description: `${cls.program} — Week ${w + 1} of ${cls.weeks}`,
          });
        }
      } catch {
        // skip
      }
    });

    // 2. Studio Tours
    state.tours.forEach((tr) => {
      list.push({
        id: `ev-tour-${tr.id}`,
        date: tr.date,
        title: `Tour: ${tr.visitorName}`,
        time: tr.time,
        layer: 'tour',
        location: 'Front Desk & Studio',
        description: `${tr.programInterest} · Assigned to ${tr.assignedStaffName} (${tr.outcome})`,
      });
    });

    // 3 & 4. Meetings (strictly respecting owner_only & invited visibility!)
    state.meetings
      .filter((m) => canViewMeeting(currentUser, m))
      .forEach((m) => {
        list.push({
          id: `ev-meet-${m.id}`,
          date: m.date,
          title: m.title,
          time: `${m.startTime}–${m.endTime}`,
          layer: m.visibility === 'owner_only' ? 'owner_meeting' : 'meeting',
          location: m.location,
          description: m.description,
          attendees: state.users
            .filter((u) => m.attendeeIds.includes(u.id))
            .map((u) => u.name),
        });
      });

    return list;
  }, [state.classes, state.tours, state.meetings, state.users, currentUser]);

  // Build month grid cells
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [currentMonth]);

  const monthEventsList = useMemo(() => {
    const ym = format(currentMonth, 'yyyy-MM');
    return events
      .filter((e) => e.date.startsWith(ym))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [events, currentMonth]);

  const layerStyle = (layer: CalendarEvent['layer']) => {
    if (layer === 'class') return 'bg-navy text-white border-navy';
    if (layer === 'tour') return 'bg-champagne-light text-navy border-champagne/60';
    if (layer === 'owner_meeting') return 'bg-terracotta-light text-terracotta-dark border-terracotta/40';
    return 'bg-sage-light text-sage-dark border-sage/40';
  };

  const layerIcon = (layer: CalendarEvent['layer']) => {
    if (layer === 'class') return <GraduationCap className="w-3 h-3 shrink-0" />;
    if (layer === 'tour') return <MapPin className="w-3 h-3 shrink-0" />;
    if (layer === 'owner_meeting') return <Lock className="w-3 h-3 shrink-0" />;
    return <Users className="w-3 h-3 shrink-0" />;
  };

  const toggleAttendee = (id: string) => {
    setForm((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(id)
        ? prev.attendeeIds.filter((x) => x !== id)
        : [...prev.attendeeIds, id],
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_calendar')}
        phase={t('phase2')}
        subtitle={
          state.language === 'es'
            ? 'Calendario mensual unificado con clases, visitas al estudio y reuniones (las reuniones de propietarios son privadas).'
            : 'Unified academy calendar combining class sessions, studio tours, and role-scoped meetings.'
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {state.language === 'es' ? 'Nueva Reunión' : 'New Meeting'}
          </Button>
        }
      />

      {/* Calendar Controls & Legend */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-editorial text-xl text-navy min-w-[170px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCurrentMonth(new Date(2026, 10, 1))}
          >
            {state.language === 'es' ? 'Hoy' : 'Today'}
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge tone="navy">
            <GraduationCap className="w-3 h-3" /> Classes
          </Badge>
          <Badge tone="champagne">
            <MapPin className="w-3 h-3" /> Tours
          </Badge>
          <Badge tone="sage">
            <Users className="w-3 h-3" /> Meetings
          </Badge>
          {currentUser?.role === 'owner' && (
            <Badge tone="terracotta">
              <Lock className="w-3 h-3" /> Owners Only
            </Badge>
          )}
        </div>
      </Card>

      {/* Desktop Month Grid */}
      <Card className="hidden md:block overflow-hidden">
        <div className="grid grid-cols-7 bg-porcelain border-b border-borderwarm text-center text-[11px] font-semibold uppercase tracking-wider text-slatewarm">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-borderwarm">
          {calendarDays.map((day) => {
            const iso = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter((e) => e.date === iso);
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = iso === '2026-11-24';

            return (
              <div
                key={iso}
                className={`min-h-[110px] p-2 ${
                  inMonth ? 'bg-white' : 'bg-porcelain/50 text-slatewarm/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center tabular-nums ${
                      isToday ? 'bg-champagne text-white' : 'text-navy'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full px-1.5 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 truncate text-left transition-opacity hover:opacity-85 ${layerStyle(
                        ev.layer
                      )}`}
                    >
                      {layerIcon(ev.layer)}
                      <span className="truncate">{ev.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Mobile Agenda View */}
      <div className="md:hidden space-y-2.5">
        {monthEventsList.map((ev) => (
          <Card
            key={ev.id}
            onClick={() => setSelectedEvent(ev)}
            className="p-3.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-xs text-slatewarm tabular-nums">
                {ev.date} · {ev.time}
              </div>
              <div className="text-sm font-semibold text-navy truncate mt-0.5">
                {ev.title}
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded-md border text-[11px] inline-flex items-center gap-1 shrink-0 ${layerStyle(
                ev.layer
              )}`}
            >
              {layerIcon(ev.layer)}
              {ev.layer.replace('_', ' ')}
            </span>
          </Card>
        ))}
      </div>

      {/* Event Detail Drawer */}
      <Drawer
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? ''}
        subtitle={selectedEvent ? `${selectedEvent.date} · ${selectedEvent.time}` : ''}
      >
        {selectedEvent && (
          <div className="space-y-4 text-sm">
            <Badge
              tone={
                selectedEvent.layer === 'class'
                  ? 'navy'
                  : selectedEvent.layer === 'tour'
                    ? 'champagne'
                    : selectedEvent.layer === 'owner_meeting'
                      ? 'terracotta'
                      : 'sage'
              }
            >
              {layerIcon(selectedEvent.layer)}
              {selectedEvent.layer.replace('_', ' ')}
            </Badge>
            <Card className="p-4 space-y-2 text-xs">
              {selectedEvent.location && (
                <div>
                  <span className="text-slatewarm">Location: </span>
                  <span className="font-medium text-navy">{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-navy leading-relaxed pt-1">{selectedEvent.description}</p>
              )}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="pt-2 border-t border-borderwarm">
                  <span className="text-slatewarm block mb-1">Attendees:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.attendees.map((a) => (
                      <Badge key={a} tone="slate">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </Drawer>

      {/* New Meeting Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={state.language === 'es' ? 'Programar Nueva Reunión' : 'Schedule New Meeting'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const res = createMeeting({
              ...form,
              visibility:
                currentUser?.role === 'owner' ? form.visibility : 'invited',
            });
            if (res.ok) {
              setCreateOpen(false);
              setForm({
                title: '',
                date: '2026-11-28',
                startTime: '10:00',
                endTime: '11:00',
                location: 'City Terrace Studio',
                attendeeIds: [currentUser?.id ?? 'user-rudy'],
                description: '',
                visibility: 'invited',
              });
            }
          }}
          className="space-y-4"
        >
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Title *</span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <div className="grid grid-cols-3 gap-2.5 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-navy">{t('date')} *</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full h-10 px-2 rounded-lg border border-borderwarm bg-porcelain text-xs"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">Start</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="mt-1 w-full h-10 px-2 rounded-lg border border-borderwarm bg-porcelain text-xs"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">End</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="mt-1 w-full h-10 px-2 rounded-lg border border-borderwarm bg-porcelain text-xs"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Location or Link</span>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          {currentUser?.role === 'owner' && (
            <label className="block text-sm">
              <span className="text-xs font-medium text-navy">Visibility</span>
              <select
                value={form.visibility}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    visibility: e.target.value as 'invited' | 'owner_only',
                  }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              >
                <option value="invited">Invited Attendees</option>
                <option value="owner_only">Owners Only (Hidden from staff)</option>
              </select>
            </label>
          )}
          <div>
            <span className="text-xs font-medium text-navy block mb-1.5">Attendees</span>
            <div className="flex flex-wrap gap-1.5">
              {state.users.map((u) => {
                const active = form.attendeeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAttendee(u.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs border ${
                      active
                        ? 'bg-navy text-white border-navy'
                        : 'bg-porcelain text-navy border-borderwarm'
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Description</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full p-2.5 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2">
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
