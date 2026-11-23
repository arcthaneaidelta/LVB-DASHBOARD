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
    <div className="min-h-screen bg-porcelain flex flex-col">
      {/* Top Bar */}
      <header className="px-4 sm:px-8 h-16 flex items-center justify-between border-b border-borderwarm bg-white/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slatewarm hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToLanding')}
        </button>

        <div className="flex items-center gap-2.5">
          <LVBMonogram size="sm" />
          <span className="font-editorial text-lg text-navy">LVB Pulse</span>
        </div>

        <div className="inline-flex items-center rounded-lg border border-borderwarm bg-porcelain p-0.5">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 text-xs font-medium rounded-md ${
              state.language === 'en' ? 'bg-navy text-white' : 'text-slatewarm'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('es')}
            className={`px-2 py-1 text-xs font-medium rounded-md ${
              state.language === 'es' ? 'bg-navy text-white' : 'text-slatewarm'
            }`}
          >
            ES
          </button>
        </div>
      </header>

      {/* Main Selector */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge tone="champagne" className="mb-3 uppercase tracking-wider text-[11px]">
              {t('demoNotice')}
            </Badge>
            <h1 className="font-editorial text-3xl sm:text-4xl text-navy">
              {t('demoAccessTitle')}
            </h1>
            <p className="text-sm text-slatewarm mt-2.5 leading-relaxed">
              {t('demoAccessSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                  className={`text-left p-5 rounded-card border transition-all duration-150 relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white border-navy ring-2 ring-champagne/40 shadow-card'
                      : 'bg-white/80 border-borderwarm hover:bg-white hover:border-champagne/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                            isSelected
                              ? 'bg-navy text-champagne-soft'
                              : 'bg-ivory text-navy'
                          }`}
                        >
                          {user.avatarInitials}
                        </div>
                        <div>
                          <div className="font-semibold text-navy text-sm">
                            {user.name}
                          </div>
                          <div className="text-xs text-slatewarm mt-0.5">
                            {state.language === 'es' ? user.titleEs : user.titleEn}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-champagne text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
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
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-borderwarm/70 text-xs text-slatewarm">
                    {assignedClasses.length > 0 ? (
                      <div>
                        <span className="font-medium text-navy">
                          {t('assignedClasses')}:{' '}
                        </span>
                        {assignedClasses.map((c) => c.name).join(', ')}
                      </div>
                    ) : (
                      <span>{getRoleScope(user.role)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-borderwarm rounded-card px-5 py-4">
            <div className="flex items-start gap-2.5 text-xs text-slatewarm">
              <Shield className="w-4 h-4 text-champagne shrink-0 mt-0.5" />
              <span>
                {state.language === 'es'
                  ? 'Entorno de demostración interactivo: los roles son simulados en el navegador. La versión de producción aplica autenticación y permisos en servidor.'
                  : 'Interactive frontend demonstration: roles are simulated client-side. Production deployment enforces server-side auth and database row-level security.'}
              </span>
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
