import React, { useMemo, useState } from 'react';
import { CheckSquare, Plus, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { useApp } from '../../services/store';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { PriorityLevel, Task, TaskStatus } from '../../types';

const TODAY = '2026-11-24';

export const TasksPage: React.FC = () => {
  const { state, currentUser, createTask, updateTask, t } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assigneeId: currentUser?.id ?? 'user-rudy',
    priority: 'normal' as PriorityLevel,
    dueDate: '2026-11-28',
    notes: '',
  });

  const visibleTasks = useMemo(() => {
    if (!currentUser) return [];
    return state.tasks
      .filter((tk) => currentUser.role === 'owner' || tk.assigneeId === currentUser.id)
      .filter((tk) => (statusFilter === 'all' ? true : tk.status === statusFilter))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state.tasks, currentUser, statusFilter]);

  const selectedTask = useMemo(
    () => visibleTasks.find((tk) => tk.id === selectedTaskId) ?? null,
    [visibleTasks, selectedTaskId]
  );

  const priorityTone = (p: PriorityLevel) => {
    if (p === 'urgent') return 'terracotta';
    if (p === 'high') return 'amber';
    if (p === 'normal') return 'champagne';
    return 'slate';
  };

  const statusTone = (s: TaskStatus) => {
    if (s === 'completed') return 'sage';
    if (s === 'in_progress') return 'navy';
    if (s === 'waiting') return 'amber';
    return 'slate';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_tasks')}
        phase={t('phase2')}
        subtitle={
          currentUser?.role === 'owner'
            ? state.language === 'es'
              ? 'Todas las tareas operativas de la academia y su seguimiento por responsable.'
              : 'All academy tasks across staff with due dates, checklists, and priority tracking.'
            : state.language === 'es'
              ? 'Tus tareas asignadas y listas de verificación.'
              : 'Your assigned academy tasks and interactive checklists.'
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {state.language === 'es' ? 'Nueva Tarea' : 'New Task'}
          </Button>
        }
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => (
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
            {st === 'all' ? t('all') : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {visibleTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
        />
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => {
            const overdue = task.status !== 'completed' && task.dueDate < TODAY;
            const doneCount = task.checklist.filter((c) => c.done).length;

            return (
              <Card
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`p-4 sm:p-5 ${overdue ? 'border-status-red/50' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                      <Badge tone={statusTone(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      {overdue && <Badge tone="terracotta">Overdue</Badge>}
                    </div>
                    <h3 className="font-semibold text-charcoal text-sm">{task.title}</h3>
                    <div className="text-xs text-softgray flex items-center gap-3 flex-wrap">
                      <span>{task.assigneeName}</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="w-3 h-3" /> Due {task.dueDate}
                      </span>
                      {task.checklist.length > 0 && (
                        <span>
                          Checklist: {doneCount}/{task.checklist.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={task.status}
                      aria-label={`Status for ${task.title}`}
                      onChange={(e) =>
                        updateTask(task.id, { status: e.target.value as TaskStatus })
                      }
                      className="h-9 px-2.5 text-xs rounded-lg border border-hairline bg-porcelain text-charcoal font-medium"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting">Waiting</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Drawer */}
      <Drawer
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        title={selectedTask?.title ?? ''}
        subtitle={
          selectedTask
            ? `${selectedTask.assigneeName} · Due ${selectedTask.dueDate}`
            : ''
        }
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge tone={priorityTone(selectedTask.priority)}>{selectedTask.priority}</Badge>
              <Badge tone={statusTone(selectedTask.status)}>
                {selectedTask.status.replace('_', ' ')}
              </Badge>
            </div>
            <Card className="p-4 text-sm text-charcoal leading-relaxed">
              {selectedTask.description || 'No additional description.'}
            </Card>
            {selectedTask.checklist.length > 0 && (
              <Card className="p-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-softgray">
                  Checklist
                </h4>
                {selectedTask.checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const nextList = selectedTask.checklist.map((c) =>
                        c.id === item.id ? { ...c, done: !c.done } : c
                      );
                      updateTask(selectedTask.id, { checklist: nextList });
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-porcelain text-left text-xs"
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-status-green shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-softgray shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-softgray' : 'text-charcoal'}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </Card>
            )}
            <div className="flex items-center gap-2">
              {selectedTask.status !== 'completed' && (
                <Button
                  className="w-full"
                  onClick={() => updateTask(selectedTask.id, { status: 'completed' })}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Task Complete
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Task Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={state.language === 'es' ? 'Crear Nueva Tarea' : 'Create New Task'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const assignee = state.users.find((u) => u.id === form.assigneeId);
            const res = createTask({
              title: form.title.trim(),
              description: form.description.trim(),
              assigneeId: form.assigneeId,
              assigneeName: assignee?.name ?? currentUser?.name ?? 'Team',
              priority: form.priority,
              status: 'not_started',
              startDate: TODAY,
              dueDate: form.dueDate,
              checklist: [],
              notes: form.notes,
            });
            if (res.ok) {
              setCreateOpen(false);
              setForm({
                title: '',
                description: '',
                assigneeId: currentUser?.id ?? 'user-rudy',
                priority: 'normal',
                dueDate: '2026-11-28',
                notes: '',
              });
            }
          }}
          className="space-y-4"
        >
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">Title *</span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">Description</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full p-2.5 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Assignee</span>
              <select
                value={form.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="mt-1 w-full h-10 px-2.5 rounded-lg border border-hairline bg-porcelain"
              >
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Priority</span>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as PriorityLevel }))
                }
                className="mt-1 w-full h-10 px-2.5 rounded-lg border border-hairline bg-porcelain"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-charcoal">Due Date</span>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="mt-1 w-full h-10 px-2.5 rounded-lg border border-hairline bg-porcelain"
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
    </div>
  );
};
