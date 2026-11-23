import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Users,
  ClipboardCheck,
  CalendarX2,
  CreditCard,
  Banknote,
  FileSpreadsheet,
  MessageSquareWarning,
  FileText,
  CalendarDays,
  CheckSquare,
  Package,
  Lightbulb,
  FolderKanban,
  Landmark,
  GraduationCap,
  ShieldCheck,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  RotateCcw,
  Globe,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../services/store';
import {
  canAccessModule,
  canViewStudent,
  getDefaultRouteForUser,
  type AppModule,
} from '../../permissions/permissions';
import type { TranslationKey } from '../../translations/dictionary';
import { Badge, Button, LVBMonogram, Modal } from '../ui/Primitives';

interface NavItemDef {
  module: AppModule;
  path: string;
  labelKey: TranslationKey;
  icon: React.FC<{ className?: string }>;
  group: 'front_desk' | 'owners';
}

const NAV_ITEMS: NavItemDef[] = [
  // Front Desk & Studio (order per PRD Section 6.2)
  { module: 'studio-tours', path: '/app/studio-tours', labelKey: 'nav_tours', icon: MapPin, group: 'front_desk' },
  { module: 'students', path: '/app/students', labelKey: 'nav_students', icon: Users, group: 'front_desk' },
  { module: 'class-log', path: '/app/class-log', labelKey: 'nav_classLog', icon: ClipboardCheck, group: 'front_desk' },
  { module: 'missed-classes', path: '/app/missed-classes', labelKey: 'nav_missedClasses', icon: CalendarX2, group: 'front_desk' },
  { module: 'payments', path: '/app/payments', labelKey: 'nav_payments', icon: CreditCard, group: 'front_desk' },
  { module: 'cash-handoff', path: '/app/cash-handoff', labelKey: 'nav_cashHandoff', icon: Banknote, group: 'front_desk' },
  { module: 'daily-cash-report', path: '/app/daily-cash-report', labelKey: 'nav_dailyCash', icon: FileSpreadsheet, group: 'front_desk' },
  { module: 'weekly-reports', path: '/app/weekly-reports', labelKey: 'nav_weeklyReports', icon: MessageSquareWarning, group: 'front_desk' },
  { module: 'documents', path: '/app/documents', labelKey: 'nav_documents', icon: FileText, group: 'front_desk' },
  { module: 'calendar', path: '/app/calendar', labelKey: 'nav_calendar', icon: CalendarDays, group: 'front_desk' },
  { module: 'tasks', path: '/app/tasks', labelKey: 'nav_tasks', icon: CheckSquare, group: 'front_desk' },
  { module: 'inventory', path: '/app/inventory', labelKey: 'nav_inventory', icon: Package, group: 'front_desk' },
  { module: 'suggestions', path: '/app/suggestions', labelKey: 'nav_suggestions', icon: Lightbulb, group: 'front_desk' },

  // Owners Only (order per PRD Section 6.2)
  { module: 'dashboard', path: '/app/dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard, group: 'owners' },
  { module: 'projects', path: '/app/projects', labelKey: 'nav_projects', icon: FolderKanban, group: 'owners' },
  { module: 'accounting', path: '/app/accounting', labelKey: 'nav_accounting', icon: Landmark, group: 'owners' },
  { module: 'classes', path: '/app/classes', labelKey: 'nav_classes', icon: GraduationCap, group: 'owners' },
  { module: 'team', path: '/app/team', labelKey: 'nav_team', icon: ShieldCheck, group: 'owners' },
];

export const AppShell: React.FC = () => {
  const { state, currentUser, selectUser, setLanguage, resetDemoData, t } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [identityMenuOpen, setIdentityMenuOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const authorizedNav = useMemo(
    () => NAV_ITEMS.filter((item) => canAccessModule(currentUser, item.module)),
    [currentUser]
  );

  const frontDeskNav = useMemo(
    () => authorizedNav.filter((i) => i.group === 'front_desk'),
    [authorizedNav]
  );
  const ownersNav = useMemo(
    () => authorizedNav.filter((i) => i.group === 'owners'),
    [authorizedNav]
  );

  // Dynamic nav badge counts
  const badgeCounts = useMemo(() => {
    const pendingDeposits = state.deposits.filter((d) => d.status === 'pending').length;
    const pendingHandoffs = state.cashHandoffs.filter((h) => h.status === 'pending').length;
    const openMissed = state.missedClasses.filter((m) => m.makeupStatus !== 'cleared').length;
    const urgentReports = state.reports.filter(
      (r) => r.status !== 'resolved' && (r.urgency === 'urgent' || r.urgency === 'high')
    ).length;
    const lowStock = state.inventory.filter((i) => i.quantity <= 5).length;

    return {
      payments: currentUser?.role === 'owner' ? pendingDeposits : 0,
      'cash-handoff': currentUser?.role === 'owner' ? pendingHandoffs : 0,
      'missed-classes': openMissed,
      'weekly-reports': currentUser?.role === 'owner' ? urgentReports : 0,
      inventory: lowStock,
    } as Partial<Record<AppModule, number>>;
  }, [state.deposits, state.cashHandoffs, state.missedClasses, state.reports, state.inventory, currentUser]);

  // Actionable notifications for Notification Center
  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const items: { id: string; title: string; detail: string; route: string; tone: 'amber' | 'terracotta' | 'champagne' }[] = [];

    if (currentUser.role === 'owner') {
      state.deposits
        .filter((d) => d.status === 'pending')
        .forEach((d) => {
          const stu = state.students.find((s) => s.id === d.studentId);
          items.push({
            id: `not-dep-${d.id}`,
            title: state.language === 'es' ? 'Depósito pendiente de confirmar' : 'Deposit awaiting confirmation',
            detail: `${stu?.fullName ?? ''} · $${d.amount} (${d.collectorName})`,
            route: '/app/payments',
            tone: 'amber',
          });
        });

      state.cashHandoffs
        .filter((h) => h.status === 'pending')
        .forEach((h) => {
          items.push({
            id: `not-ho-${h.id}`,
            title: state.language === 'es' ? 'Entrega de efectivo pendiente' : 'Cash handoff awaiting confirmation',
            detail: `${h.collectorName} · $${h.expectedCash.toFixed(2)} (${h.date})`,
            route: '/app/cash-handoff',
            tone: 'champagne',
          });
        });

      state.reports
        .filter((r) => r.status !== 'resolved' && r.urgency === 'urgent')
        .forEach((r) => {
          items.push({
            id: `not-rep-${r.id}`,
            title: state.language === 'es' ? 'Reporte urgente' : 'Urgent report',
            detail: `${r.subject} (${r.submittedByName})`,
            route: '/app/weekly-reports',
            tone: 'terracotta',
          });
        });
    }

    // Overdue tasks assigned to current user (or all for owner)
    const today = '2026-11-24';
    state.tasks
      .filter(
        (tk) =>
          tk.status !== 'completed' &&
          tk.dueDate < today &&
          (currentUser.role === 'owner' || tk.assigneeId === currentUser.id)
      )
      .forEach((tk) => {
        items.push({
          id: `not-task-${tk.id}`,
          title: state.language === 'es' ? 'Tarea vencida' : 'Overdue task',
          detail: `${tk.title} (${tk.dueDate})`,
          route: '/app/tasks',
          tone: 'terracotta',
        });
      });

    // Today's tours
    state.tours
      .filter((tr) => tr.date === today && tr.outcome === 'pending')
      .forEach((tr) => {
        items.push({
          id: `not-tour-${tr.id}`,
          title: state.language === 'es' ? 'Visita programada hoy' : 'Studio tour today',
          detail: `${tr.visitorName} · ${tr.time}`,
          route: '/app/studio-tours',
          tone: 'champagne',
        });
      });

    return items.slice(0, 8);
  }, [currentUser, state]);

  // Global local search across authorized records
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !currentUser) return [];
    const results: { id: string; type: string; title: string; subtitle: string; route: string }[] = [];

    state.students
      .filter((s) => canViewStudent(currentUser, s))
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach((s) =>
        results.push({
          id: `sr-stu-${s.id}`,
          type: state.language === 'es' ? 'Alumna' : 'Student',
          title: s.fullName,
          subtitle: `${s.program} · ${s.phone}`,
          route: `/app/students?studentId=${s.id}`,
        })
      );

    if (canAccessModule(currentUser, 'studio-tours')) {
      state.tours
        .filter(
          (tr) =>
            tr.visitorName.toLowerCase().includes(q) ||
            tr.programInterest.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .forEach((tr) =>
          results.push({
            id: `sr-tour-${tr.id}`,
            type: state.language === 'es' ? 'Visita' : 'Tour',
            title: tr.visitorName,
            subtitle: `${tr.date} ${tr.time} · ${tr.programInterest}`,
            route: '/app/studio-tours',
          })
        );
    }

    if (canAccessModule(currentUser, 'inventory')) {
      state.inventory
        .filter(
          (inv) =>
            inv.name.toLowerCase().includes(q) ||
            inv.sku.toLowerCase().includes(q) ||
            inv.category.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .forEach((inv) =>
          results.push({
            id: `sr-inv-${inv.id}`,
            type: state.language === 'es' ? 'Inventario' : 'Inventory',
            title: inv.name,
            subtitle: `${inv.category} · Qty ${inv.quantity}`,
            route: '/app/inventory',
          })
        );
    }

    if (canAccessModule(currentUser, 'payments')) {
      state.payments
        .filter(
          (p) =>
            (currentUser.role === 'owner' || p.collectorId === currentUser.id) &&
            p.receiptNumber.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .forEach((p) =>
          results.push({
            id: `sr-pay-${p.id}`,
            type: state.language === 'es' ? 'Recibo' : 'Receipt',
            title: p.receiptNumber,
            subtitle: `$${p.amount.toFixed(2)} · ${p.date} · ${p.collectorName}`,
            route: '/app/payments',
          })
        );
    }

    return results;
  }, [searchQuery, currentUser, state]);

  const currentNavDef = useMemo(
    () => NAV_ITEMS.find((n) => location.pathname.startsWith(n.path)),
    [location.pathname]
  );

  // Mobile primary bottom bar (4 role-relevant shortcuts + Menu)
  const mobilePrimaryItems = useMemo(() => {
    if (!currentUser) return [];
    const preferred: AppModule[] =
      currentUser.role === 'owner'
        ? ['dashboard', 'students', 'class-log', 'accounting']
        : currentUser.role === 'instructor'
          ? ['class-log', 'students', 'cash-handoff', 'daily-cash-report']
          : currentUser.role === 'telemarketing'
            ? ['students', 'studio-tours', 'payments', 'tasks']
            : ['studio-tours', 'students', 'inventory', 'tasks'];
    return preferred
      .map((m) => NAV_ITEMS.find((i) => i.module === m))
      .filter((x): x is NavItemDef => Boolean(x));
  }, [currentUser]);

  const handleSwitchIdentity = (userId: string) => {
    const nextUser = state.users.find((u) => u.id === userId);
    selectUser(userId);
    setIdentityMenuOpen(false);
    if (nextUser) {
      // If current module is unauthorized for the new role, send them to their default workspace
      if (!currentNavDef || !canAccessModule(nextUser, currentNavDef.module)) {
        navigate(getDefaultRouteForUser(nextUser));
      }
    }
  };

  if (!currentUser) return null;

  const renderNavLink = (item: NavItemDef, isMobile = false) => {
    const Icon = item.icon;
    const count = badgeCounts[item.module] ?? 0;
    return (
      <NavLink
        key={item.module}
        to={item.path}
        onClick={() => isMobile && setMobileNavOpen(false)}
        title={collapsed && !isMobile ? t(item.labelKey) : undefined}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150 ${
            isActive
              ? 'bg-navy-deep text-white'
              : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-champagne"
                aria-hidden="true"
              />
            )}
            <Icon
              className={`w-[18px] h-[18px] shrink-0 ${
                isActive ? 'text-champagne-soft' : 'text-white/60 group-hover:text-white/90'
              }`}
            />
            {(!collapsed || isMobile) && (
              <span className="truncate flex-1">{t(item.labelKey)}</span>
            )}
            {(!collapsed || isMobile) && count > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-champagne/20 text-champagne-soft tabular-nums">
                {count}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-navy text-white select-none">
      {/* Brand header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => {
            navigate(getDefaultRouteForUser(currentUser));
            if (isMobile) setMobileNavOpen(false);
          }}
          className="flex items-center gap-3 min-w-0 text-left"
        >
          <LVBMonogram size="sm" />
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <div className="font-editorial text-lg leading-none text-white tracking-wide">
                LVB Pulse
              </div>
              <div className="text-[9.5px] tracking-[0.16em] text-champagne-soft uppercase mt-1 truncate">
                La Voute Beauty Academy
              </div>
            </div>
          )}
        </button>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="p-2 text-white/70 hover:text-white rounded-lg"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary Navigation">
        {ownersNav.length > 0 && (
          <div>
            {(!collapsed || isMobile) && (
              <div className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-champagne-soft/80">
                {t('navGroupOwners')}
              </div>
            )}
            <div className="space-y-0.5">
              {ownersNav.map((item) => renderNavLink(item, isMobile))}
            </div>
          </div>
        )}

        <div>
          {(!collapsed || isMobile) && (
            <div className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {t('navGroupFrontDesk')}
            </div>
          )}
          <div className="space-y-0.5">
            {frontDeskNav.map((item) => renderNavLink(item, isMobile))}
          </div>
        </div>
      </nav>

      {/* Bottom demo footer */}
      <div className="p-3 border-t border-white/10 shrink-0 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            navigate('/');
            if (isMobile) setMobileNavOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-champagne-soft" />
          {(!collapsed || isMobile) && <span>{t('backToLanding')}</span>}
        </button>
        {(!collapsed || isMobile) && (
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/55 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>{t('resetDemoData')}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-porcelain text-navy">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 border-r border-navy-deep no-print ${
          collapsed ? 'w-[76px]' : 'w-[252px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent(false)}</div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-navy/50 no-print"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="w-[276px] max-w-[85vw] h-full shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-borderwarm px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 no-print">
          {/* Left: Mobile Menu + Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-navy hover:bg-ivory"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex items-center gap-2">
              <span className="hidden sm:inline text-xs font-medium uppercase tracking-[0.12em] text-slatewarm">
                LVB Pulse
              </span>
              <span className="hidden sm:inline text-borderwarm">/</span>
              <span className="text-sm font-semibold text-navy truncate">
                {currentNavDef ? t(currentNavDef.labelKey) : t('brandName')}
              </span>
            </div>
          </div>

          {/* Center: Global Search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-slatewarm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                state.language === 'es'
                  ? 'Buscar alumnas, recibos, visitas o inventario...'
                  : 'Search students, receipts, tours, or inventory...'
              }
              className="w-full h-9 pl-9 pr-3 text-sm bg-porcelain border border-borderwarm rounded-lg text-navy placeholder:text-slatewarm/80 focus:bg-white focus:border-champagne transition-colors"
            />
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-11 bg-white border border-borderwarm rounded-xl shadow-elevated overflow-hidden z-40">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-slatewarm text-center">
                    {t('noResults')}
                  </div>
                ) : (
                  <ul className="divide-y divide-borderwarm max-h-80 overflow-y-auto">
                    {searchResults.map((res) => (
                      <li key={res.id}>
                        <button
                          type="button"
                          onMouseDown={() => {
                            navigate(res.route);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-porcelain flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-navy truncate">
                              {res.title}
                            </div>
                            <div className="text-xs text-slatewarm truncate">
                              {res.subtitle}
                            </div>
                          </div>
                          <Badge tone="slate">{res.type}</Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: Language, Notifications, Demo Identity Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Switcher */}
            <div
              className="inline-flex items-center rounded-lg border border-borderwarm bg-porcelain p-0.5"
              role="group"
              aria-label={t('languageLabel')}
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  state.language === 'en'
                    ? 'bg-navy text-white'
                    : 'text-slatewarm hover:text-navy'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  state.language === 'es'
                    ? 'bg-navy text-white'
                    : 'text-slatewarm hover:text-navy'
                }`}
              >
                ES
              </button>
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setIdentityMenuOpen(false);
                }}
                className="relative p-2 rounded-lg text-navy hover:bg-ivory transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-[18px] h-[18px]" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-terracotta ring-2 ring-white" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 max-w-[90vw] bg-white border border-borderwarm rounded-xl shadow-elevated z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-borderwarm flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-navy">
                      {state.language === 'es' ? 'Notificaciones' : 'Notifications'}
                    </span>
                    <Badge tone="champagne">{notifications.length}</Badge>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-5 text-xs text-slatewarm text-center">
                      {t('allCaughtUp')}
                    </div>
                  ) : (
                    <ul className="divide-y divide-borderwarm max-h-80 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => {
                              navigate(n.route);
                              setNotifOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-porcelain transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  n.tone === 'terracotta'
                                    ? 'bg-terracotta'
                                    : n.tone === 'amber'
                                      ? 'bg-amberwarm'
                                      : 'bg-champagne'
                                }`}
                              />
                              <span className="text-xs font-semibold text-navy">
                                {n.title}
                              </span>
                            </div>
                            <p className="text-xs text-slatewarm mt-1 pl-3.5">
                              {n.detail}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Demo Identity Selector & Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIdentityMenuOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-borderwarm bg-porcelain hover:bg-ivory transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-navy text-champagne-soft text-xs font-semibold flex items-center justify-center shrink-0">
                  {currentUser.avatarInitials}
                </span>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-semibold text-navy max-w-[115px] truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10.5px] text-slatewarm flex items-center gap-1">
                    <span>{t(`role_${currentUser.role}` as TranslationKey)}</span>
                    <span className="text-champagne">· Demo</span>
                  </div>
                </div>
                <RefreshCw className="w-3.5 h-3.5 text-slatewarm hidden sm:block" />
              </button>

              {identityMenuOpen && (
                <div className="absolute right-0 top-12 w-72 max-w-[92vw] bg-white border border-borderwarm rounded-xl shadow-elevated z-40 overflow-hidden">
                  <div className="px-4 py-2.5 bg-porcelain border-b border-borderwarm">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-champagne">
                      {t('switchIdentity')}
                    </div>
                    <p className="text-[11px] text-slatewarm mt-0.5">
                      {state.language === 'es'
                        ? 'Simulación de rol para demostración'
                        : 'Demo role simulation · updates full app context'}
                    </p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {state.users.map((u) => {
                      const active = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSwitchIdentity(u.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                            active
                              ? 'bg-navy text-white'
                              : 'hover:bg-porcelain text-navy'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${
                              active
                                ? 'bg-champagne text-white'
                                : 'bg-ivory text-navy'
                            }`}
                          >
                            {u.avatarInitials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">
                              {u.name}
                            </div>
                            <div
                              className={`text-[11px] truncate ${
                                active ? 'text-champagne-soft' : 'text-slatewarm'
                              }`}
                            >
                              {t(`role_${u.role}` as TranslationKey)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-borderwarm p-2 flex items-center justify-between gap-2 bg-porcelain/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIdentityMenuOpen(false);
                        setResetModalOpen(true);
                      }}
                      className="text-xs text-slatewarm hover:text-navy flex items-center gap-1.5 px-2 py-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('resetDemoData')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIdentityMenuOpen(false);
                        navigate('/');
                      }}
                      className="text-xs text-champagne hover:underline flex items-center gap-1 px-2 py-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {t('backToLanding')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-1 px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 pb-24 lg:pb-10 max-w-[1440px] w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-borderwarm px-1 py-1.5 flex items-center justify-around no-print"
        aria-label="Mobile Navigation"
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.module}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-[60px] text-[10.5px] font-medium transition-colors ${
                  isActive ? 'text-navy bg-champagne-light/60' : 'text-slatewarm'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[68px]">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-[56px] text-[10.5px] font-medium text-slatewarm"
        >
          <Menu className="w-4 h-4" />
          <span>{state.language === 'es' ? 'Más' : 'More'}</span>
        </button>
      </nav>

      {/* Reset Demo Data Confirmation Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={t('resetDemoData')}
      >
        <p className="text-sm text-slatewarm leading-relaxed">
          {t('resetDemoConfirm')}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetModalOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetDemoData();
              setResetModalOpen(false);
            }}
          >
            {t('resetDemoData')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
