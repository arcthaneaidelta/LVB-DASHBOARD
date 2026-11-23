import React, { useState } from 'react';
import { Globe, RotateCcw, Server, Sliders, Users } from 'lucide-react';
import { useApp } from '../../services/store';
import { Badge, Button, Modal, PageHeader } from '../../components/ui/Primitives';
import type { TranslationKey } from '../../translations/dictionary';

export const SettingsPage: React.FC = () => {
  const { state, currentUser, setLanguage, selectUser, updatePolicy, resetDemoData, pushToast, t } =
    useApp();
  const [resetOpen, setResetOpen] = useState(false);

  const isOwner = currentUser?.role === 'owner';

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={t('nav_settings')}
        phase={t('navGroupAdmin')}
        subtitle={
          state.language === 'es'
            ? 'Preferencias de idioma, controles de demostración, políticas de privacidad y especificaciones de producción.'
            : 'Language preferences, interactive demo controls, role policies, and production infrastructure overview.'
        }
      />

      {/* Language & Workspace Preferences */}
      <div className="bg-white border border-hairline rounded-atelier divide-y divide-hairline overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-olive mt-1 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-charcoal">{t('languageLabel')}</h2>
              <p className="text-xs text-softgray mt-0.5">
                {state.language === 'es'
                  ? 'Cambia toda la aplicación, validaciones y reportes PDF entre Inglés y Español.'
                  : 'Switch the entire workspace, form validation, and generated PDFs between English and Spanish.'}
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-lg border border-hairline bg-porcelain p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                state.language === 'en' ? 'bg-olive text-white' : 'text-softgray'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                state.language === 'es' ? 'bg-olive text-white' : 'text-softgray'
              }`}
            >
              Español
            </button>
          </div>
        </div>

        {/* Quick Demo Role Switch */}
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 text-olive mt-1 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-charcoal">{t('switchIdentity')}</h2>
              <p className="text-xs text-softgray mt-0.5">
                {state.language === 'es'
                  ? 'Cambia de identidad activa para probar los permisos de cada rol.'
                  : 'Switch active demo persona to inspect each role’s navigation, permissions, and visible records.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {state.users.map((u) => {
              const active = u.id === currentUser?.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    active
                      ? 'bg-olive text-white border-olive'
                      : 'bg-porcelain text-charcoal border-hairline hover:border-olive/60'
                  }`}
                >
                  <div className="text-xs font-semibold">{u.name}</div>
                  <div className={`text-[11px] ${active ? 'text-mist/85' : 'text-softgray'}`}>
                    {t(`role_${u.role}` as TranslationKey)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Owner Configurable Policy */}
        {isOwner && (
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sliders className="w-4 h-4 text-clay mt-1 shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-charcoal">
                    Telemarketing Balance Visibility
                  </h2>
                  <Badge tone="amber">Configurable Policy</Badge>
                </div>
                <p className="text-xs text-softgray mt-0.5 max-w-xl">
                  Allow Telemarketing (Jessica) to view detailed student balances when following up. Hidden by default per specification.
                </p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={state.policy.telemarketingCanSeeBalances}
                onChange={(e) => {
                  updatePolicy({ telemarketingCanSeeBalances: e.target.checked });
                  pushToast(
                    e.target.checked
                      ? 'Telemarketing balance visibility enabled.'
                      : 'Telemarketing balance visibility hidden (default).',
                    'info'
                  );
                }}
                className="w-4 h-4 accent-olive"
              />
              <span className="text-xs font-semibold text-charcoal">
                {state.policy.telemarketingCanSeeBalances ? 'Visible' : 'Hidden'}
              </span>
            </label>
          </div>
        )}

        {/* Reset Demo Data */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-status-red mt-1 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-charcoal">{t('resetDemoData')}</h2>
              <p className="text-xs text-softgray mt-0.5">
                {state.language === 'es'
                  ? 'Restaura las 14 alumnas, 2 clases, 101 productos y pagos de muestra al estado inicial.'
                  : 'Restore all 14 students, 2 nail classes, 101 inventory items, and seeded transactions.'}
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>
            {t('resetDemoData')}
          </Button>
        </div>
      </div>

      {/* Production Architecture & Hosting Compatibility Note (Section 28) */}
      <div className="bg-charcoal text-porcelain rounded-atelier p-6 space-y-3">
        <div className="flex items-center gap-2 text-clay text-xs font-semibold uppercase tracking-[0.16em]">
          <Server className="w-4 h-4" />
          Production Architecture Compatibility
        </div>
        <h3 className="font-editorial text-2xl text-white">
          Showcase Demo vs. Full Production Deployment
        </h3>
        <p className="text-xs text-mist/80 leading-relaxed">
          This interactive demonstration runs client-side with simulated roles and local browser persistence. The production implementation planned for La Voute Beauty Academy (~$25–50/mo hosting target) includes:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-mist/85 pt-1">
          <div>• Individual email or phone authentication</div>
          <div>• Owner invitations & user deactivation</div>
          <div>• Four server-enforced roles & DB RLS policies</div>
          <div>• Audit trail recording old & new values</div>
          <div>• Server-locked confirmed cash records</div>
          <div>• Daily automated encrypted backups</div>
          <div>• Custom domain & bilingual server PDFs</div>
          <div>• Historical contract & 101-product import</div>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t('resetDemoData')}
      >
        <p className="text-sm text-softgray leading-relaxed">{t('resetDemoConfirm')}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetDemoData();
              setResetOpen(false);
            }}
          >
            {t('resetDemoData')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
