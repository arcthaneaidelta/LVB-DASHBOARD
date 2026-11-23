import React, { useMemo, useState } from 'react';
import { MessageSquareWarning, Plus, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../services/store';
import { canManageReports, canViewReport } from '../../permissions/permissions';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { ReportCategory, WeeklyReport } from '../../types';

export const WeeklyReportsPage: React.FC = () => {
  const { state, currentUser, createReport, updateReport, t } = useApp();

  const isOwner = currentUser ? canManageReports(currentUser) : false;
  const [categoryFilter, setCategoryFilter] = useState<'all' | ReportCategory>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ownerReply, setOwnerReply] = useState('');
  const [ownerStatus, setOwnerStatus] = useState<WeeklyReport['status']>('in_review');

  const [form, setForm] = useState({
    category: 'general' as ReportCategory,
    subject: '',
    description: '',
    urgency: 'normal' as WeeklyReport['urgency'],
    date: '2026-11-24',
  });

  const visibleReports = useMemo(() => {
    if (!currentUser) return [];
    return state.reports
      .filter((r) => canViewReport(currentUser, r))
      .filter((r) => (categoryFilter === 'all' ? true : r.category === categoryFilter))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.reports, currentUser, categoryFilter]);

  const selectedReport = useMemo(
    () => visibleReports.find((r) => r.id === selectedId) ?? null,
    [visibleReports, selectedId]
  );

  const catLabel = (c: ReportCategory) => {
    const map: Record<ReportCategory, [string, string]> = {
      immediate_assistance: ['Immediate Assistance', 'Asistencia Inmediata'],
      supplies: ['Supplies', 'Suministros'],
      complaints: ['Complaints', 'Quejas'],
      general: ['General', 'General'],
    };
    return state.language === 'es' ? map[c][1] : map[c][0];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_weeklyReports')}
        phase={t('phase2')}
        subtitle={
          isOwner
            ? state.language === 'es'
              ? 'Todos los reportes enviados por el equipo con seguimiento y resolución.'
              : 'All internal team reports, urgent escalations, and owner resolution notes.'
            : state.language === 'es'
              ? 'Tus reportes privados enviados a los propietarios (los reportes de otros miembros son privados).'
              : 'Your private reports submitted to ownership (other team members’ reports are private).'
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {state.language === 'es' ? 'Nuevo Reporte' : 'Submit Report'}
          </Button>
        }
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'immediate_assistance', 'supplies', 'complaints', 'general'] as const).map(
          (cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === cat
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-slatewarm border-borderwarm hover:text-navy'
              }`}
            >
              {cat === 'all' ? t('all') : catLabel(cat)}
            </button>
          )
        )}
      </div>

      {visibleReports.length === 0 ? (
        <EmptyState
          icon={<MessageSquareWarning className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {state.language === 'es' ? 'Enviar Reporte' : 'Submit Report'}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleReports.map((rep) => (
            <Card
              key={rep.id}
              onClick={() => {
                setSelectedId(rep.id);
                setOwnerReply(rep.ownerResponse ?? '');
                setOwnerStatus(rep.status);
              }}
              className="p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      tone={
                        rep.urgency === 'urgent'
                          ? 'terracotta'
                          : rep.urgency === 'high'
                            ? 'amber'
                            : 'slate'
                      }
                    >
                      {rep.urgency}
                    </Badge>
                    <Badge tone="champagne">{catLabel(rep.category)}</Badge>
                    <Badge
                      tone={
                        rep.status === 'resolved'
                          ? 'sage'
                          : rep.status === 'in_review'
                            ? 'amber'
                            : 'navy'
                      }
                    >
                      {rep.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-navy text-sm">{rep.subject}</h3>
                  <p className="text-xs text-slatewarm line-clamp-2">{rep.description}</p>
                  {rep.ownerResponse && (
                    <div className="text-xs text-sage-dark bg-sage-light/60 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Owner response: {rep.ownerResponse}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-slatewarm shrink-0 sm:text-right">
                  <div className="font-medium text-navy">{rep.submittedByName}</div>
                  <div className="tabular-nums">{rep.date}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Report Detail / Owner Response Drawer */}
      <Drawer
        open={Boolean(selectedReport)}
        onClose={() => setSelectedId(null)}
        title={selectedReport?.subject ?? ''}
        subtitle={
          selectedReport
            ? `${selectedReport.submittedByName} · ${selectedReport.date}`
            : ''
        }
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge tone="champagne">{catLabel(selectedReport.category)}</Badge>
              <Badge tone={selectedReport.urgency === 'urgent' ? 'terracotta' : 'amber'}>
                {selectedReport.urgency}
              </Badge>
              <Badge tone={selectedReport.status === 'resolved' ? 'sage' : 'navy'}>
                {selectedReport.status}
              </Badge>
            </div>
            <Card className="p-4 text-sm text-navy leading-relaxed">
              {selectedReport.description}
            </Card>

            {isOwner ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateReport(selectedReport.id, {
                    ownerResponse: ownerReply,
                    status: ownerStatus,
                  });
                  setSelectedId(null);
                }}
                className="space-y-3 pt-2"
              >
                <label className="block text-sm">
                  <span className="text-xs font-medium text-navy">{t('status')}</span>
                  <select
                    value={ownerStatus}
                    onChange={(e) =>
                      setOwnerStatus(e.target.value as WeeklyReport['status'])
                    }
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-medium text-navy">
                    {state.language === 'es' ? 'Respuesta del Propietario' : 'Owner Response'}
                  </span>
                  <textarea
                    rows={3}
                    value={ownerReply}
                    onChange={(e) => setOwnerReply(e.target.value)}
                    className="mt-1 w-full p-2.5 rounded-lg border border-borderwarm bg-white"
                  />
                </label>
                <Button type="submit" className="w-full">
                  {t('save')}
                </Button>
              </form>
            ) : (
              selectedReport.ownerResponse && (
                <Card className="p-4 bg-sage-light/40 border-sage/30 text-xs text-navy">
                  <div className="font-semibold mb-1">Owner Response</div>
                  <p>{selectedReport.ownerResponse}</p>
                </Card>
              )
            )}
          </div>
        )}
      </Drawer>

      {/* Submit Report Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={state.language === 'es' ? 'Enviar Reporte Semanal' : 'Submit Weekly Report'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const res = createReport(form);
            if (res.ok) {
              setCreateOpen(false);
              setForm({
                category: 'general',
                subject: '',
                description: '',
                urgency: 'normal',
                date: '2026-11-24',
              });
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-navy">Category</span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as ReportCategory }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              >
                <option value="immediate_assistance">{catLabel('immediate_assistance')}</option>
                <option value="supplies">{catLabel('supplies')}</option>
                <option value="complaints">{catLabel('complaints')}</option>
                <option value="general">{catLabel('general')}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">Urgency</span>
              <select
                value={form.urgency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    urgency: e.target.value as WeeklyReport['urgency'],
                  }))
                }
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Subject *</span>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Description *</span>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full p-2.5 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
