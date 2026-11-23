import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Users,
  Globe,
  Compass,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  canAccessModule,
  canViewStudent,
  getDefaultRouteForUser,
  type AppModule,
} from '../../permissions/permissions';
import type { TranslationKey } from '../../translations/dictionary';

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

const MODULE_LINKS: { module: AppModule; path: string; key: TranslationKey }[] = [
  { module: 'dashboard', path: '/app/dashboard', key: 'nav_dashboard' },
  { module: 'students', path: '/app/students', key: 'nav_students' },
  { module: 'classes', path: '/app/classes', key: 'nav_classes' },
  { module: 'class-log', path: '/app/class-log', key: 'nav_classLog' },
  { module: 'studio-tours', path: '/app/studio-tours', key: 'nav_tours' },
  { module: 'accounting', path: '/app/accounting', key: 'nav_accounting' },
  { module: 'deposits', path: '/app/deposits', key: 'nav_deposits' },
  { module: 'payments', path: '/app/payments', key: 'nav_payments' },
  { module: 'cash-handoff', path: '/app/cash-handoff', key: 'nav_cashHandoff' },
  { module: 'reports', path: '/app/reports', key: 'nav_reports' },
  { module: 'missed-classes', path: '/app/missed-classes', key: 'nav_missedClasses' },
  { module: 'tasks', path: '/app/tasks', key: 'nav_tasks' },
  { module: 'projects', path: '/app/projects', key: 'nav_projects' },
  { module: 'inventory', path: '/app/inventory', key: 'nav_inventory' },
  { module: 'calendar', path: '/app/calendar', key: 'nav_calendar' },
  { module: 'suggestions', path: '/app/suggestions', key: 'nav_suggestions' },
  { module: 'weekly-reports', path: '/app/weekly-reports', key: 'nav_weeklyReports' },
  { module: 'team', path: '/app/team', key: 'nav_team' },
  { module: 'settings', path: '/app/settings', key: 'nav_settings' },
];

export const CommandPalette: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { state, currentUser, selectUser, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    if (!currentUser) return [];
    const q = query.trim().toLowerCase();
    const list: PaletteItem[] = [];

    // 1. Authorized Modules
    MODULE_LINKS.filter((m) => canAccessModule(currentUser, m.module)).forEach((m) => {
      const label = t(m.key);
      if (!q || label.toLowerCase().includes(q) || m.module.includes(q)) {
        list.push({
          id: `mod-${m.module}`,
          group: state.language === 'es' ? 'Navegación' : 'Navigate',
          title: label,
          subtitle: m.path,
          icon: <Compass className="w-4 h-4 text-olive" />,
          onSelect: () => {
            navigate(m.path);
            onClose();
          },
        });
      }
    });

    // 2. Authorized Students
    state.students
      .filter((s) => canViewStudent(currentUser, s))
      .filter(
        (s) =>
          !q ||
          s.fullName.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q)
      )
      .slice(0, q ? 6 : 3)
      .forEach((s) => {
        list.push({
          id: `stu-${s.id}`,
          group: state.language === 'es' ? 'Alumnas' : 'Students',
          title: s.fullName,
          subtitle: `${s.program} · ${s.phone}`,
          icon: <Users className="w-4 h-4 text-clay-dark" />,
          onSelect: () => {
            navigate(`/app/students?studentId=${s.id}`);
            onClose();
          },
        });
      });

    // 3. Switch Demo Roles
    state.users
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
      .forEach((u) => {
        list.push({
          id: `role-${u.id}`,
          group: t('switchIdentity'),
          title: `${u.name} (${t(`role_${u.role}` as TranslationKey)})`,
          subtitle: state.language === 'es' ? u.titleEs : u.titleEn,
          icon: <UserCheck className="w-4 h-4 text-olive" />,
          onSelect: () => {
            selectUser(u.id);
            navigate(getDefaultRouteForUser(u));
            onClose();
          },
        });
      });

    // 4. Language Toggle
    const nextLang = state.language === 'en' ? 'es' : 'en';
    const langTitle =
      nextLang === 'es' ? 'Switch Language to Español (ES)' : 'Switch Language to English (EN)';
    if (!q || langTitle.toLowerCase().includes(q) || 'spanish'.includes(q) || 'english'.includes(q)) {
      list.push({
        id: 'action-lang',
        group: state.language === 'es' ? 'Preferencias' : 'Preferences',
        title: langTitle,
        icon: <Globe className="w-4 h-4 text-clay-dark" />,
        onSelect: () => {
          setLanguage(nextLang);
          onClose();
        },
      });
    }

    return list.slice(0, 14);
  }, [currentUser, query, state, t, navigate, onClose, selectUser, setLanguage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(items.length - 1, i + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      }
      if (e.key === 'Enter' && items[activeIdx]) {
        e.preventDefault();
        items[activeIdx].onSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, activeIdx, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-charcoal/45 backdrop-blur-[2px] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick Command Palette"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-hairline rounded-2xl shadow-elevated overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-hairline flex items-center gap-3">
          <Search className="w-4 h-4 text-softgray shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder={
              state.language === 'es'
                ? 'Ir a un módulo, buscar alumna, o cambiar de rol...'
                : 'Jump to a module, find a student, or switch roles...'
            }
            className="flex-1 text-sm text-charcoal bg-transparent placeholder:text-softgray focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-softgray hover:text-charcoal hover:bg-mist"
            aria-label="Close palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-softgray">{t('noResults')}</div>
          ) : (
            <ul className="space-y-0.5">
              {items.map((item, idx) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={item.onSelect}
                    className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 text-left transition-colors ${
                      idx === activeIdx ? 'bg-mist/85 text-charcoal' : 'text-charcoal/85 hover:bg-porcelain'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-md bg-white border border-hairline flex items-center justify-center shrink-0">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-softgray truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-softgray font-semibold">
                        {item.group}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-olive" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 bg-porcelain border-t border-hairline flex items-center justify-between text-[11px] text-softgray">
          <span>↑↓ Navigate · ↵ Open · Esc Close</span>
          <span className="font-medium text-olive">LVB Pulse Command</span>
        </div>
      </div>
    </div>
  );
};
