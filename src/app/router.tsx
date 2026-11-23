import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useApp } from '../services/store';
import {
  canAccessModule,
  getDefaultRouteForUser,
  type AppModule,
} from '../permissions/permissions';
import { AccessRestricted } from '../components/ui/Primitives';
import { AppShell } from '../components/layout/AppShell';
import { LandingPage } from '../features/landing/LandingPage';
import { DemoAccessScreen } from '../features/auth/DemoAccessScreen';

// Lazy-loaded operational modules for blazing-fast initial load & clean chunking
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const StudentsPage = lazy(() =>
  import('../features/students/StudentsPage').then((m) => ({ default: m.StudentsPage }))
);
const ClassesPage = lazy(() =>
  import('../features/classes/ClassesPage').then((m) => ({ default: m.ClassesPage }))
);
const ClassLogPage = lazy(() =>
  import('../features/class-log/ClassLogPage').then((m) => ({ default: m.ClassLogPage }))
);
const DepositsPage = lazy(() =>
  import('../features/deposits/DepositsPage').then((m) => ({ default: m.DepositsPage }))
);
const PaymentsPage = lazy(() =>
  import('../features/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage }))
);
const CashHandoffPage = lazy(() =>
  import('../features/cash-handoff/CashHandoffPage').then((m) => ({ default: m.CashHandoffPage }))
);
const DailyCashReportPage = lazy(() =>
  import('../features/reports/DailyCashReportPage').then((m) => ({
    default: m.DailyCashReportPage,
  }))
);
const ReportsHubPage = lazy(() =>
  import('../features/reports/ReportsHubPage').then((m) => ({ default: m.ReportsHubPage }))
);
const AccountingPage = lazy(() =>
  import('../features/accounting/AccountingPage').then((m) => ({ default: m.AccountingPage }))
);
const MissedClassesPage = lazy(() =>
  import('../features/missed-classes/MissedClassesPage').then((m) => ({
    default: m.MissedClassesPage,
  }))
);
const StudioToursPage = lazy(() =>
  import('../features/tours/StudioToursPage').then((m) => ({ default: m.StudioToursPage }))
);
const InventoryPage = lazy(() =>
  import('../features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage }))
);
const WeeklyReportsPage = lazy(() =>
  import('../features/weekly-reports/WeeklyReportsPage').then((m) => ({
    default: m.WeeklyReportsPage,
  }))
);
const TasksPage = lazy(() =>
  import('../features/tasks/TasksPage').then((m) => ({ default: m.TasksPage }))
);
const ProjectsPage = lazy(() =>
  import('../features/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))
);
const CalendarPage = lazy(() =>
  import('../features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage }))
);
const SuggestionsPage = lazy(() =>
  import('../features/suggestions/SuggestionsPage').then((m) => ({ default: m.SuggestionsPage }))
);
const DocumentsPage = lazy(() =>
  import('../features/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
);
const TeamAccessPage = lazy(() =>
  import('../features/team/TeamAccessPage').then((m) => ({ default: m.TeamAccessPage }))
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PageSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="pb-5 border-b border-hairline">
      <div className="h-3 w-24 bg-mist rounded mb-2" />
      <div className="h-8 w-64 bg-mist rounded" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="h-24 bg-white border border-hairline rounded-atelier" />
      ))}
    </div>
    <div className="h-64 bg-white border border-hairline rounded-atelier" />
  </div>
);

const ModuleGuard: React.FC<{
  module: AppModule;
  children: React.ReactNode;
}> = ({ module, children }) => {
  const { currentUser, t } = useApp();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/app" replace />;
  }

  if (!canAccessModule(currentUser, module)) {
    return (
      <AccessRestricted
        title={t('accessRestrictedTitle')}
        description={t('accessRestrictedDesc')}
        actionLabel={t('returnToWorkspace')}
        onReturn={() => navigate(getDefaultRouteForUser(currentUser))}
      />
    );
  }

  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
};

const AppRootGate: React.FC = () => {
  const { currentUser } = useApp();
  if (!currentUser) {
    return <DemoAccessScreen />;
  }
  return <AppShell />;
};

const AppDefaultRedirect: React.FC = () => {
  const { currentUser } = useApp();
  if (!currentUser) return <DemoAccessScreen />;
  return <Navigate to={getDefaultRouteForUser(currentUser)} replace />;
};

export const AppRouter: React.FC = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/demo-access" element={<DemoAccessScreen />} />
    <Route path="/app" element={<AppRootGate />}>
      <Route index element={<AppDefaultRedirect />} />
      <Route path="dashboard" element={<ModuleGuard module="dashboard"><DashboardPage /></ModuleGuard>} />
      <Route path="students" element={<ModuleGuard module="students"><StudentsPage /></ModuleGuard>} />
      <Route path="classes" element={<ModuleGuard module="classes"><ClassesPage /></ModuleGuard>} />
      <Route path="class-log" element={<ModuleGuard module="class-log"><ClassLogPage /></ModuleGuard>} />
      <Route path="deposits" element={<ModuleGuard module="deposits"><DepositsPage /></ModuleGuard>} />
      <Route path="payments" element={<ModuleGuard module="payments"><PaymentsPage /></ModuleGuard>} />
      <Route path="cash-handoff" element={<ModuleGuard module="cash-handoff"><CashHandoffPage /></ModuleGuard>} />
      <Route path="reports" element={<ModuleGuard module="reports"><ReportsHubPage /></ModuleGuard>} />
      <Route path="daily-cash-report" element={<ModuleGuard module="daily-cash-report"><DailyCashReportPage /></ModuleGuard>} />
      <Route path="accounting" element={<ModuleGuard module="accounting"><AccountingPage /></ModuleGuard>} />
      <Route path="missed-classes" element={<ModuleGuard module="missed-classes"><MissedClassesPage /></ModuleGuard>} />
      <Route path="studio-tours" element={<ModuleGuard module="studio-tours"><StudioToursPage /></ModuleGuard>} />
      <Route path="inventory" element={<ModuleGuard module="inventory"><InventoryPage /></ModuleGuard>} />
      <Route path="weekly-reports" element={<ModuleGuard module="weekly-reports"><WeeklyReportsPage /></ModuleGuard>} />
      <Route path="tasks" element={<ModuleGuard module="tasks"><TasksPage /></ModuleGuard>} />
      <Route path="projects" element={<ModuleGuard module="projects"><ProjectsPage /></ModuleGuard>} />
      <Route path="calendar" element={<ModuleGuard module="calendar"><CalendarPage /></ModuleGuard>} />
      <Route path="suggestions" element={<ModuleGuard module="suggestions"><SuggestionsPage /></ModuleGuard>} />
      <Route path="documents" element={<ModuleGuard module="documents"><DocumentsPage /></ModuleGuard>} />
      <Route path="team" element={<ModuleGuard module="team"><TeamAccessPage /></ModuleGuard>} />
      <Route path="settings" element={<ModuleGuard module="settings"><SettingsPage /></ModuleGuard>} />
      <Route path="*" element={<AppDefaultRedirect />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
