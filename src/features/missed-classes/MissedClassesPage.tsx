import React, { useMemo, useState } from 'react';
import { CalendarX2, CheckCircle2, Calendar, ShieldCheck } from 'lucide-react';
import { useApp } from '../../services/store';
import { canClearMissedClass, canScheduleMakeup } from '../../permissions/permissions';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { MakeupStatus, MissedClassRecord } from '../../types';

export const MissedClassesPage: React.FC = () => {
  const { state, currentUser, updateMissedClass, clearMissedClass, t } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | MakeupStatus>('all');
  const [scheduleTarget, setScheduleTarget] = useState<MissedClassRecord | null>(null);
  const [makeupDate, setMakeupDate] = useState('2026-11-28');
  const [makeupNotes, setMakeupNotes] = useState('');

  const canSchedule = currentUser ? canScheduleMakeup(currentUser) : false;
  const canClear = currentUser ? canClearMissedClass(currentUser) : false;

  const visibleRecords = useMemo(() => {
    if (!currentUser) return [];
    return state.missedClasses
      .filter((m) =>
        currentUser.role === 'instructor'
          ? currentUser.assignedClassIds.includes(m.classId)
          : true
      )
      .filter((m) => (statusFilter === 'all' ? true : m.makeupStatus === statusFilter))
      .sort((a, b) => b.originalDate.localeCompare(a.originalDate));
  }, [state.missedClasses, currentUser, statusFilter]);

  const statusTone = (st: MakeupStatus) => {
    if (st === 'cleared') return 'sage';
    if (st === 'completed') return 'champagne';
    if (st === 'scheduled') return 'amber';
    return 'terracotta';
  };

  const statusLabel = (st: MakeupStatus) => {
    if (state.language === 'es') {
      if (st === 'open') return 'Abierta';
      if (st === 'scheduled') return 'Reposición Agendada';
      if (st === 'completed') return 'Completada (Esperando Propietario)';
      return 'Cerrada por Propietario';
    }
    if (st === 'open') return 'Open';
    if (st === 'scheduled') return 'Makeup Scheduled';
    if (st === 'completed') return 'Completed (Awaiting Owner)';
    return 'Owner Cleared';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_missedClasses')}
        phase={t('phase2')}
        subtitle={
          state.language === 'es'
            ? 'Ciclo: Abierta → Reposición Agendada → Completada → Cierre obligatorio por Propietario.'
            : 'Lifecycle: Open → Makeup Scheduled → Completed → Mandatory Owner Clearance.'
        }
      />

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'open', 'scheduled', 'completed', 'cleared'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === st
                ? 'bg-olive text-white border-olive'
                : 'bg-white text-softgray border-hairline hover:text-charcoal'
            }`}
          >
            {st === 'all' ? t('all') : statusLabel(st)}
          </button>
        ))}
      </div>

      {visibleRecords.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
        />
      ) : (
        <div className="space-y-3">
          {visibleRecords.map((rec) => {
            const stu = state.students.find((s) => s.id === rec.studentId);
            const cls = state.classes.find((c) => c.id === rec.classId);

            return (
              <Card key={rec.id} className="p-4 sm:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-charcoal text-sm">
                        {stu?.fullName ?? rec.studentId}
                      </span>
                      <Badge tone={rec.attendanceStatus === 'A' ? 'terracotta' : 'amber'}>
                        {rec.attendanceStatus === 'A' ? t('att_A') : t('att_E')}
                      </Badge>
                      <Badge tone={statusTone(rec.makeupStatus)}>
                        {statusLabel(rec.makeupStatus)}
                      </Badge>
                    </div>
                    <div className="text-xs text-softgray">
                      {cls?.name} · Week {rec.originalWeek} ({rec.originalDate})
                      {rec.scheduledMakeupDate && (
                        <span>
                          {' '}
                          ·{' '}
                          <strong className="text-charcoal">
                            Makeup: {rec.scheduledMakeupDate}
                          </strong>
                        </span>
                      )}
                    </div>
                    {rec.notes && <p className="text-xs text-softgray">{rec.notes}</p>}
                    {rec.clearedByName && (
                      <div className="text-xs text-status-green inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Cleared by {rec.clearedByName} ({rec.clearedAt?.slice(0, 10)})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {canSchedule && rec.makeupStatus === 'open' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setScheduleTarget(rec);
                          setMakeupDate('2026-11-28');
                          setMakeupNotes(rec.notes);
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {state.language === 'es' ? 'Agendar Reposición' : 'Schedule Makeup'}
                      </Button>
                    )}

                    {canSchedule && rec.makeupStatus === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="champagne"
                        onClick={() =>
                          updateMissedClass(rec.id, { makeupStatus: 'completed' })
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {state.language === 'es' ? 'Marcar Completada' : 'Mark Completed'}
                      </Button>
                    )}

                    {canClear && rec.makeupStatus !== 'cleared' && (
                      <Button size="sm" onClick={() => clearMissedClass(rec.id)}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {state.language === 'es' ? 'Cerrar (Propietario)' : 'Owner Clear'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Makeup Modal */}
      <Modal
        open={Boolean(scheduleTarget)}
        onClose={() => setScheduleTarget(null)}
        title={state.language === 'es' ? 'Agendar Clase de Reposición' : 'Schedule Makeup Session'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!scheduleTarget) return;
            updateMissedClass(scheduleTarget.id, {
              makeupStatus: 'scheduled',
              scheduledMakeupDate: makeupDate,
              notes: makeupNotes,
            });
            setScheduleTarget(null);
          }}
          className="space-y-4"
        >
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">
              {state.language === 'es' ? 'Fecha de Reposición' : 'Makeup Date'}
            </span>
            <input
              type="date"
              required
              value={makeupDate}
              onChange={(e) => setMakeupDate(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">{t('notes')}</span>
            <textarea
              rows={2}
              value={makeupNotes}
              onChange={(e) => setMakeupNotes(e.target.value)}
              className="mt-1 w-full p-2.5 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setScheduleTarget(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
