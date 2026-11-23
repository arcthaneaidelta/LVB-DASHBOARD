import React from 'react';
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
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { StudentsPage } from '../features/students/StudentsPage';
import { ClassesPage } from '../features/classes/ClassesPage';
import { ClassLogPage } from '../features/class-log/ClassLogPage';
import { DepositsPage } from '../features/deposits/DepositsPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { CashHandoffPage } from '../features/cash-handoff/CashHandoffPage';
import { DailyCashReportPage } from '../features/reports/DailyCashReportPage';
import { ReportsHubPage } from '../features/reports/ReportsHubPage';
import { AccountingPage } from '../features/accounting/AccountingPage';
import { MissedClassesPage } from '../features/missed-classes/MissedClassesPage';
import { StudioToursPage } from '../features/tours/StudioToursPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { WeeklyReportsPage } from '../features/weekly-reports/WeeklyReportsPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { SuggestionsPage } from '../features/suggestions/SuggestionsPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { TeamAccessPage } from '../features/team/TeamAccessPage';
import { SettingsPage } from '../features/settings/SettingsPage';

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

  return <>{children}</>;
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
      <Route
        path="dashboard"
        element={
          <ModuleGuard module="dashboard">
            <DashboardPage />
          </ModuleGuard>
        }
      />
      <Route
        path="students"
        element={
          <ModuleGuard module="students">
            <StudentsPage />
          </ModuleGuard>
        }
      />
      <Route
        path="classes"
        element={
          <ModuleGuard module="classes">
            <ClassesPage />
          </ModuleGuard>
        }
      />
      <Route
        path="class-log"
        element={
          <ModuleGuard module="class-log">
            <ClassLogPage />
          </ModuleGuard>
        }
      />
      <Route
        path="deposits"
        element={
          <ModuleGuard module="deposits">
            <DepositsPage />
          </ModuleGuard>
        }
      />
      <Route
        path="payments"
        element={
          <ModuleGuard module="payments">
            <PaymentsPage />
          </ModuleGuard>
        }
      />
      <Route
        path="cash-handoff"
        element={
          <ModuleGuard module="cash-handoff">
            <CashHandoffPage />
          </ModuleGuard>
        }
      />
      <Route
        path="reports"
        element={
          <ModuleGuard module="reports">
            <ReportsHubPage />
          </ModuleGuard>
        }
      />
      <Route
        path="daily-cash-report"
        element={
          <ModuleGuard module="daily-cash-report">
            <DailyCashReportPage />
          </ModuleGuard>
        }
      />
      <Route
        path="accounting"
        element={
          <ModuleGuard module="accounting">
            <AccountingPage />
          </ModuleGuard>
        }
      />
      <Route
        path="missed-classes"
        element={
          <ModuleGuard module="missed-classes">
            <MissedClassesPage />
          </ModuleGuard>
        }
      />
      <Route
        path="studio-tours"
        element={
          <ModuleGuard module="studio-tours">
            <StudioToursPage />
          </ModuleGuard>
        }
      />
      <Route
        path="inventory"
        element={
          <ModuleGuard module="inventory">
            <InventoryPage />
          </ModuleGuard>
        }
      />
      <Route
        path="weekly-reports"
        element={
          <ModuleGuard module="weekly-reports">
            <WeeklyReportsPage />
          </ModuleGuard>
        }
      />
      <Route
        path="tasks"
        element={
          <ModuleGuard module="tasks">
            <TasksPage />
          </ModuleGuard>
        }
      />
      <Route
        path="projects"
        element={
          <ModuleGuard module="projects">
            <ProjectsPage />
          </ModuleGuard>
        }
      />
      <Route
        path="calendar"
        element={
          <ModuleGuard module="calendar">
            <CalendarPage />
          </ModuleGuard>
        }
      />
      <Route
        path="suggestions"
        element={
          <ModuleGuard module="suggestions">
            <SuggestionsPage />
          </ModuleGuard>
        }
      />
      <Route
        path="documents"
        element={
          <ModuleGuard module="documents">
            <DocumentsPage />
          </ModuleGuard>
        }
      />
      <Route
        path="team"
        element={
          <ModuleGuard module="team">
            <TeamAccessPage />
          </ModuleGuard>
        }
      />
      <Route
        path="settings"
        element={
          <ModuleGuard module="settings">
            <SettingsPage />
          </ModuleGuard>
        }
      />
      <Route path="*" element={<AppDefaultRedirect />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
