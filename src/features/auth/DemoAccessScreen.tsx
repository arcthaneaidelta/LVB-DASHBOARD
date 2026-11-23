import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Shield, Check } from 'lucide-react';
import { useApp } from '../../services/store';
import { getDefaultRouteForUser } from '../../permissions/permissions';
import { Badge, Button, LVBMonogram } from '../../components/ui/Primitives';
import type { TranslationKey } from '../../translations/dictionary';

export const DemoAccessScreen: React.FC = () => {
  const { state, selectUser, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>(
    state.currentUserId ?? 'user-rudy'
  );

  const selectedUser = state.users.find((u) => u.id === selectedId) ?? state.users[0];

  const handleContinue = () => {
    selectUser(selectedUser.id);
    navigate(getDefaultRouteForUser(selectedUser));
  };

  const getRoleScope = (role: string) => {
    if (role === 'owner') return t('fullAcademyAccess');
    if (role === 'telemarketing') return t('admissionsAndTours');
    if (role === 'staff') return t('frontDeskAndCounts');
    return t('assignedClasses');
  };

  return (
    <div className="min-h-screen bg-porcelain grid grid-cols-1 lg:grid-cols-12">
      {/* Left Editorial Atelier Column (Deep Olive #424D40) */}
      <aside className="lg:col-span-5 bg-olive text-porcelain p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-medium text-porcelain/75 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLanding')}
          </button>

          <div className="inline-flex items-center rounded-lg border border-white/15 bg-olive-dark p-0.5">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs font-semibold rounded-md ${
                state.language === 'en' ? 'bg-porcelain text-charcoal' : 'text-porcelain/70'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={`px-2 py-1 text-xs font-semibold rounded-md ${
                state.language === 'es' ? 'bg-porcelain text-charcoal' : 'text-porcelain/70'
              }`}
            >
              ES
            </button>
          </div>
        </div>

        <div className="my-10 lg:my-0 space-y-5">
          <div className="flex items-center gap-3">
            <LVBMonogram size="md" tone="porcelain" />
            <div>
              <div className="font-editorial text-2xl leading-none text-white">LVB Pulse</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-mist/80 mt-1">
                La Voute Beauty Academy LLC
              </div>
            </div>
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[42px] leading-[1.1] text-white">
            {t('demoAccessTitle')}
          </h1>

          <p className="text-sm text-mist/85 leading-relaxed max-w-md">
            {t('demoAccessSub')}
          </p>

          <div className="pt-4 border-t border-white/15 grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="font-editorial text-2xl text-white">14</div>
              <div className="text-mist/75 mt-0.5">
                {state.language === 'es' ? 'Alumnas' : 'Students'}
              </div>
            </div>
            <div>
              <div className="font-editorial text-2xl text-white">101</div>
              <div className="text-mist/75 mt-0.5">
                {state.language === 'es' ? 'Productos' : 'Inventory'}
              </div>
            </div>
            <div>
              <div className="font-editorial text-2xl text-white">4</div>
              <div className="text-mist/75 mt-0.5">
                {state.language === 'es' ? 'Roles' : 'Roles'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-[11.5px] text-mist/75 pt-6 border-t border-white/15">
          <Shield className="w-4 h-4 text-clay shrink-0 mt-0.5" />
          <span>
            {state.language === 'es'
              ? 'Demostración interactiva: los roles son simulados en el navegador. La versión de producción incluye inicio de sesión individual y seguridad en servidor.'
              : 'Interactive showcase: roles are simulated client-side. Production deployment enforces individual login and server-side database policies.'}
          </span>
        </div>
      </aside>

      {/* Right Workspace Selector Column (Porcelain #F7F5F0) */}
      <main className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-center">
        <div className="max-w-2xl w-full mx-auto">
          <div className="flex items-center justify-between gap-2 mb-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-dark">
              {t('demoNotice')}
            </span>
          </div>

          <div className="bg-white border border-hairline rounded-atelier divide-y divide-hairline overflow-hidden">
            {state.users.map((user) => {
              const isSelected = user.id === selectedId;
              const assignedClasses = state.classes.filter((c) =>
                user.assignedClassIds.includes(c.id)
              );

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedId(user.id)}
                  onDoubleClick={() => {
                    selectUser(user.id);
                    navigate(getDefaultRouteForUser(user));
                  }}
                  className={`w-full text-left px-5 py-4 flex items-center justify-between gap-4 transition-colors ${
                    isSelected
                      ? 'bg-mist/70'
                      : 'bg-white hover:bg-porcelain/70'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-olive text-white'
                          : 'bg-mist text-olive'
                      }`}
                    >
                      {user.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-charcoal">
                          {user.name}
                        </span>
                        <Badge
                          tone={
                            user.role === 'owner'
                              ? 'olive'
                              : user.role === 'instructor'
                                ? 'clay'
                                : user.role === 'telemarketing'
                                  ? 'green'
                                  : 'gray'
                          }
                        >
                          {t(`role_${user.role}` as TranslationKey)}
                        </Badge>
                      </div>
                      <div className="text-xs text-softgray mt-0.5 truncate">
                        {state.language === 'es' ? user.titleEs : user.titleEn} ·{' '}
                        {assignedClasses.length > 0
                          ? assignedClasses.map((c) => c.name).join(', ')
                          : getRoleScope(user.role)}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-olive border-olive text-white'
                        : 'border-hairline bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-softgray">
              {state.language === 'es'
                ? 'Podrás cambiar entre cualquier rol desde la barra superior en cualquier momento.'
                : 'Switch seamlessly between all 4 roles from the top bar at any time.'}
            </div>
            <Button size="lg" onClick={handleContinue} className="w-full sm:w-auto shrink-0">
              <span>
                {t('continueAs')} {selectedUser.firstName}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
