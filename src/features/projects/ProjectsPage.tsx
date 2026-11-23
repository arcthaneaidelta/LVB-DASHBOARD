import React, { useState } from 'react';
import { FolderKanban, Plus, CheckCircle2, Circle } from 'lucide-react';
import { useApp } from '../../services/store';
import {
  Badge,
  Button,
  Card,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { Project } from '../../types';

export const ProjectsPage: React.FC = () => {
  const { state, createProject, updateProject, t } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    timeframe: 'Q1 2027',
    ownerId: 'user-rudy',
    stepsText: '',
    notes: '',
  });

  const statusTone = (st: Project['status']) => {
    if (st === 'completed') return 'sage';
    if (st === 'active') return 'champagne';
    if (st === 'on_hold') return 'amber';
    return 'slate';
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const owner = state.users.find((u) => u.id === form.ownerId);
    const steps = form.stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title, i) => ({ id: `ps-${Date.now()}-${i}`, title, done: false }));
    const res = createProject({
      name: form.name.trim(),
      description: form.description.trim(),
      status: 'active',
      timeframe: form.timeframe.trim(),
      ownerId: form.ownerId,
      ownerName: owner?.name ?? 'Rudy Figueroa',
      steps,
      notes: form.notes.trim(),
    });
    if (res.ok) {
      setCreateOpen(false);
      setForm({
        name: '',
        description: '',
        timeframe: 'Q1 2027',
        ownerId: 'user-rudy',
        stepsText: '',
        notes: '',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_projects')}
        phase={t('phase2')}
        subtitle={
          state.language === 'es'
            ? 'Iniciativas estratégicas solo para propietarios: lanzamientos de grupos, mejoras del estudio y despliegue operativo.'
            : 'Owner-only strategic initiatives, cohort launches, and studio upgrades.'
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {state.language === 'es' ? 'Nuevo Proyecto' : 'New Project'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {state.projects.map((proj) => {
          const totalSteps = proj.steps.length;
          const doneSteps = proj.steps.filter((s) => s.done).length;
          const pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

          return (
            <Card key={proj.id} className="p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={statusTone(proj.status)}>{proj.status}</Badge>
                      <span className="text-xs text-slatewarm">{proj.timeframe}</span>
                    </div>
                    <h2 className="font-editorial text-2xl text-navy mt-1.5">
                      {proj.name}
                    </h2>
                  </div>
                  <select
                    value={proj.status}
                    aria-label={`Status for ${proj.name}`}
                    onChange={(e) =>
                      updateProject(proj.id, {
                        status: e.target.value as Project['status'],
                      })
                    }
                    className="h-8 px-2 text-xs rounded-lg border border-borderwarm bg-porcelain text-navy"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <p className="text-xs text-slatewarm leading-relaxed">
                  {proj.description}
                </p>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slatewarm">
                      Owner: <strong className="text-navy">{proj.ownerName}</strong>
                    </span>
                    <span className="font-semibold text-navy tabular-nums">
                      {doneSteps}/{totalSteps} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-ivory rounded-full overflow-hidden">
                    <div
                      className="h-full bg-champagne rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {proj.steps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        const nextSteps = proj.steps.map((s) =>
                          s.id === step.id ? { ...s, done: !s.done } : s
                        );
                        updateProject(proj.id, { steps: nextSteps });
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-borderwarm/70 bg-porcelain/50 hover:bg-porcelain text-left text-xs transition-colors"
                    >
                      {step.done ? (
                        <CheckCircle2 className="w-4 h-4 text-sage-dark shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slatewarm shrink-0" />
                      )}
                      <span className={step.done ? 'line-through text-slatewarm' : 'text-navy'}>
                        {step.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {proj.notes && (
                <div className="pt-3 border-t border-borderwarm text-xs text-slatewarm italic">
                  {proj.notes}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={state.language === 'es' ? 'Nuevo Proyecto Estratégico' : 'New Strategic Project'}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Project Name *</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Description</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full p-2.5 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-navy">Timeframe</span>
              <input
                type="text"
                value={form.timeframe}
                onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-navy">Lead Owner</span>
              <select
                value={form.ownerId}
                onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-borderwarm bg-porcelain"
              >
                {state.users
                  .filter((u) => u.role === 'owner')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-medium text-navy">Milestones (one per line)</span>
            <textarea
              rows={3}
              placeholder="Finalize vendor quote&#10;Confirm studio schedule"
              value={form.stepsText}
              onChange={(e) => setForm((f) => ({ ...f, stepsText: e.target.value }))}
              className="mt-1 w-full p-2.5 rounded-lg border border-borderwarm bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">
              <FolderKanban className="w-4 h-4" />
              {t('create')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
