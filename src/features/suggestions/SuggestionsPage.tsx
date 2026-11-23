import React, { useState } from 'react';
import { Lightbulb, Plus } from 'lucide-react';
import { useApp } from '../../services/store';
import { canManageSuggestions } from '../../permissions/permissions';
import {
  Badge,
  Button,
  Card,
  Modal,
  PageHeader,
} from '../../components/ui/Primitives';
import type { SuggestionStatus } from '../../types';

export const SuggestionsPage: React.FC = () => {
  const { state, currentUser, createSuggestion, updateSuggestion, t } = useApp();

  const isOwner = currentUser ? canManageSuggestions(currentUser) : false;
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    department: 'Front Desk & Studio',
  });

  const statusTone = (st: SuggestionStatus) => {
    if (st === 'implemented' || st === 'accepted') return 'sage';
    if (st === 'under_review') return 'amber';
    if (st === 'declined') return 'terracotta';
    return 'slate';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_suggestions')}
        phase={t('phase2')}
        subtitle={
          state.language === 'es'
            ? 'Buzón de ideas y mejoras propuestas por el equipo de La Voute.'
            : 'Submit studio improvements and track owner review status.'
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {state.language === 'es' ? 'Nueva Sugerencia' : 'Submit Suggestion'}
          </Button>
        }
      />

      <div className="space-y-3">
        {state.suggestions.map((sug) => (
          <Card key={sug.id} className="p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={statusTone(sug.status)}>
                    {sug.status.replace('_', ' ')}
                  </Badge>
                  <Badge tone="champagne">{sug.department}</Badge>
                  <span className="text-xs text-softgray tabular-nums">{sug.date}</span>
                </div>
                <h3 className="font-semibold text-charcoal text-base">{sug.title}</h3>
                <p className="text-xs text-softgray leading-relaxed">{sug.description}</p>
                <div className="text-xs text-softgray pt-1">
                  Suggested by <strong className="text-charcoal">{sug.suggestedByName}</strong>
                </div>
                {sug.ownerNotes && (
                  <div className="text-xs text-status-green bg-status-greenBg/60 px-3 py-1.5 rounded-lg inline-block mt-1">
                    Owner note: {sug.ownerNotes}
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="shrink-0">
                  <select
                    value={sug.status}
                    aria-label={`Status for ${sug.title}`}
                    onChange={(e) =>
                      updateSuggestion(sug.id, e.target.value as SuggestionStatus)
                    }
                    className="h-9 px-3 text-xs rounded-lg border border-hairline bg-porcelain text-charcoal font-medium"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                    <option value="implemented">Implemented</option>
                  </select>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={state.language === 'es' ? 'Enviar Sugerencia' : 'Submit an Idea'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const res = createSuggestion(form);
            if (res.ok) {
              setCreateOpen(false);
              setForm({ title: '', description: '', department: 'Front Desk & Studio' });
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
            <span className="text-xs font-medium text-charcoal">Department / Position</span>
            <select
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-hairline bg-porcelain"
            >
              <option value="Front Desk & Studio">Front Desk & Studio</option>
              <option value="Instruction">Instruction</option>
              <option value="Telemarketing & Admissions">Telemarketing & Admissions</option>
              <option value="Operations">Operations</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-charcoal">Description *</span>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full p-2.5 rounded-lg border border-hairline bg-porcelain"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">
              <Lightbulb className="w-4 h-4" />
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
