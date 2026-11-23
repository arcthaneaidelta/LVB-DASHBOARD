import React from 'react';
import { ShieldCheck, Check, X, Server, Sliders } from 'lucide-react';
import { useApp } from '../../services/store';
import { Badge, Card, PageHeader } from '../../components/ui/Primitives';
import type { TranslationKey } from '../../translations/dictionary';

const PERMISSION_ROWS = [
  { label: 'Owner Dashboard', owner: true, instructor: false, telemarketing: false, staff: false },
  { label: 'Accounting & Reporting Center', owner: true, instructor: false, telemarketing: false, staff: false },
  { label: 'Class Log & Attendance', owner: 'All', instructor: 'Assigned', telemarketing: false, staff: false },
  { label: 'Enrolled Students', owner: 'All', instructor: 'Assigned', telemarketing: 'All', staff: 'Basic' },
  { label: 'Take Deposit', owner: true, instructor: true, telemarketing: true, staff: false },
  { label: 'Confirm Deposit', owner: true, instructor: false, telemarketing: false, staff: false },
  { label: 'View Payments', owner: 'All', instructor: 'Own', telemarketing: 'Own', staff: false },
  { label: 'Confirm & Lock Cash Handoff', owner: true, instructor: false, telemarketing: false, staff: false },
  { label: 'Studio Tours', owner: 'Full', instructor: 'View', telemarketing: 'Manage', staff: 'Manage' },
  { label: 'Inventory Counts', owner: 'Full', instructor: true, telemarketing: false, staff: true },
  { label: 'Inventory Costs & Valuation', owner: true, instructor: false, telemarketing: false, staff: false },
  { label: 'Owner Open Projects', owner: true, instructor: false, telemarketing: false, staff: false },
];

export const TeamAccessPage: React.FC = () => {
  const { state, updatePolicy, pushToast, t } = useApp();

  const renderCell = (val: boolean | string) => {
    if (val === true)
      return <Check className="w-4 h-4 text-sage-dark mx-auto" aria-label="Yes" />;
    if (val === false)
      return <X className="w-4 h-4 text-slatewarm/40 mx-auto" aria-label="No" />;
    return <span className="text-xs font-medium text-navy">{val}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_team')}
        phase={t('phase1')}
        subtitle={
          state.language === 'es'
            ? 'Directorio de roles del equipo, matriz de permisos, políticas configurables y arquitectura de producción.'
            : 'Academy team roster, role-based permission matrix, configurable policies, and production security roadmap.'
        }
      />

      {/* Team Members */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.users.map((user) => {
          const assigned = state.classes.filter((c) =>
            user.assignedClassIds.includes(c.id)
          );
          return (
            <Card key={user.id} className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-navy text-champagne-soft flex items-center justify-center font-semibold text-sm">
                  {user.avatarInitials}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-navy text-sm truncate">
                    {user.name}
                  </div>
                  <div className="text-xs text-slatewarm truncate">
                    {state.language === 'es' ? user.titleEs : user.titleEn}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-borderwarm text-xs">
                <Badge
                  tone={
                    user.role === 'owner'
                      ? 'navy'
                      : user.role === 'instructor'
                        ? 'champagne'
                        : user.role === 'telemarketing'
                          ? 'sage'
                          : 'slate'
                  }
                >
                  {t(`role_${user.role}` as TranslationKey)}
                </Badge>
                <span className="text-slatewarm truncate max-w-[160px]">
                  {assigned.length > 0
                    ? assigned.map((c) => c.name).join(', ')
                    : user.email}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Configurable Policy Decision (PRD Section 7.3) */}
      <Card className="p-5 border-champagne/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-champagne" />
              <h2 className="text-base font-semibold text-navy">
                {state.language === 'es'
                  ? 'Decisión de Política Configurable — Visibilidad de Saldos para Telemercadeo'
                  : 'Configurable Policy Decision — Telemarketing Balance Visibility'}
              </h2>
              <Badge tone="amber">Open Client Policy</Badge>
            </div>
            <p className="text-xs text-slatewarm max-w-2xl leading-relaxed">
              {state.language === 'es'
                ? 'Determina si Telemercadeo (Jessica) puede ver los saldos financieros detallados de las alumnas al dar seguimiento. Por defecto permanece desactivado.'
                : 'Controls whether Telemarketing (Jessica) can inspect detailed student payment balances when following up, or only basic enrollment status. Defaults to hidden until confirmed by Rudy.'}
            </p>
          </div>
          <label className="inline-flex items-center gap-2.5 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={state.policy.telemarketingCanSeeBalances}
              onChange={(e) => {
                updatePolicy({ telemarketingCanSeeBalances: e.target.checked });
                pushToast(
                  e.target.checked
                    ? 'Policy updated: Telemarketing can now view student balances.'
                    : 'Policy updated: Detailed balances hidden for Telemarketing.',
                  'info'
                );
              }}
              className="w-5 h-5 accent-navy rounded"
            />
            <span className="text-xs font-semibold text-navy">
              {state.policy.telemarketingCanSeeBalances
                ? 'Balances Visible'
                : 'Balances Hidden (Default)'}
            </span>
          </label>
        </div>
      </Card>

      {/* Permission Matrix */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-borderwarm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-champagne" />
          <h2 className="text-base font-semibold text-navy">
            {state.language === 'es'
              ? 'Matriz de Permisos por Rol'
              : 'Role-Based Access Matrix'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-porcelain border-b border-borderwarm text-[11px] uppercase tracking-wider text-slatewarm">
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4 text-center">{t('role_owner')}</th>
                <th className="py-3 px-4 text-center">{t('role_instructor')}</th>
                <th className="py-3 px-4 text-center">{t('role_telemarketing')}</th>
                <th className="py-3 px-4 text-center">{t('role_staff')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderwarm">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.label} className="hover:bg-porcelain/50">
                  <td className="py-2.5 px-4 font-medium text-navy">{row.label}</td>
                  <td className="py-2.5 px-4 text-center">{renderCell(row.owner)}</td>
                  <td className="py-2.5 px-4 text-center">{renderCell(row.instructor)}</td>
                  <td className="py-2.5 px-4 text-center">{renderCell(row.telemarketing)}</td>
                  <td className="py-2.5 px-4 text-center">{renderCell(row.staff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Production Architecture Note (PRD Section 30.7) */}
      <Card className="p-5 bg-navy text-white border-navy">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-champagne-soft shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-editorial text-xl text-white">
              {state.language === 'es'
                ? 'Nota de Arquitectura: Demostración vs. Producción'
                : 'Technical Architecture Note: Demonstration vs. Production'}
            </h3>
            <p className="text-xs text-white/75 leading-relaxed">
              {state.language === 'es'
                ? 'Esta edición es una demostración interactiva frontend con roles simulados y persistencia local en navegador. No pretende sustituir seguridad de producción.'
                : 'This client demonstration simulates roles and persistence locally in your browser. It intentionally does not claim production-level security.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs text-champagne-soft">
              <div>• Real Authentication & MFA</div>
              <div>• Server-Side Authorization</div>
              <div>• Database Row-Level Security (RLS)</div>
              <div>• Immutable Audit Trails</div>
              <div>• Server-Locked Cash Records</div>
              <div>• Automated Encrypted Backups</div>
              <div>• Managed Cloud Hosting</div>
              <div>• Historical Contract Import (#00001–#00030)</div>
              <div>• Server-Side Archival PDFs</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
