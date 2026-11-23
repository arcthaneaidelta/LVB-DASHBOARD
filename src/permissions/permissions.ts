import type {
  AcademyClass,
  CashHandoff,
  DemoUser,
  Meeting,
  Payment,
  PolicySettings,
  Student,
  WeeklyReport,
} from '../types';

export type AppModule =
  | 'dashboard'
  | 'studio-tours'
  | 'students'
  | 'class-log'
  | 'missed-classes'
  | 'deposits'
  | 'payments'
  | 'cash-handoff'
  | 'reports'
  | 'daily-cash-report'
  | 'weekly-reports'
  | 'documents'
  | 'calendar'
  | 'tasks'
  | 'inventory'
  | 'suggestions'
  | 'projects'
  | 'accounting'
  | 'classes'
  | 'team'
  | 'settings';

const ROLE_MODULES: Record<DemoUser['role'], AppModule[]> = {
  owner: [
    'dashboard',
    'studio-tours',
    'students',
    'classes',
    'class-log',
    'accounting',
    'deposits',
    'payments',
    'cash-handoff',
    'reports',
    'daily-cash-report',
    'documents',
    'missed-classes',
    'tasks',
    'projects',
    'inventory',
    'calendar',
    'suggestions',
    'weekly-reports',
    'team',
    'settings',
  ],
  instructor: [
    'students',
    'class-log',
    'studio-tours',
    'deposits',
    'payments',
    'cash-handoff',
    'reports',
    'daily-cash-report',
    'documents',
    'missed-classes',
    'tasks',
    'inventory',
    'calendar',
    'suggestions',
    'weekly-reports',
    'settings',
  ],
  telemarketing: [
    'students',
    'studio-tours',
    'deposits',
    'payments',
    'documents',
    'missed-classes',
    'tasks',
    'calendar',
    'suggestions',
    'weekly-reports',
    'settings',
  ],
  staff: [
    'students',
    'studio-tours',
    'tasks',
    'inventory',
    'calendar',
    'suggestions',
    'weekly-reports',
    'settings',
  ],
};

export function canAccessModule(user: DemoUser | null, module: AppModule): boolean {
  if (!user) return false;
  return ROLE_MODULES[user.role].includes(module);
}

export function getDefaultRouteForUser(user: DemoUser): string {
  switch (user.role) {
    case 'owner':
      return '/app/dashboard';
    case 'instructor':
      return '/app/class-log';
    case 'telemarketing':
      return '/app/students';
    case 'staff':
      return '/app/studio-tours';
  }
}

export function canViewClass(user: DemoUser, academyClass: AcademyClass): boolean {
  if (user.role === 'owner') return true;
  if (user.role === 'instructor') {
    return (
      user.assignedClassIds.includes(academyClass.id) ||
      academyClass.instructorIds.includes(user.id)
    );
  }
  return user.role === 'telemarketing';
}

export function canViewStudent(user: DemoUser, student: Student): boolean {
  if (user.role === 'owner' || user.role === 'telemarketing' || user.role === 'staff') {
    return true;
  }
  if (user.role === 'instructor') {
    return user.assignedClassIds.includes(student.classId);
  }
  return false;
}

export function canEnrollOrEditStudent(user: DemoUser): boolean {
  return user.role === 'owner' || user.role === 'telemarketing';
}

export function canViewStudentFinancials(
  user: DemoUser,
  policy: PolicySettings
): boolean {
  if (user.role === 'owner') return true;
  if (user.role === 'instructor') return true;
  if (user.role === 'telemarketing') return policy.telemarketingCanSeeBalances;
  return false;
}

export function canViewBehindSchedule(user: DemoUser): boolean {
  return user.role === 'owner';
}

export function canRecordPayment(user: DemoUser, student?: Student): boolean {
  if (user.role === 'owner') return true;
  if (user.role === 'instructor') {
    return student ? user.assignedClassIds.includes(student.classId) : true;
  }
  if (user.role === 'telemarketing') return true;
  return false;
}

export function canTakeDeposit(user: DemoUser): boolean {
  return (
    user.role === 'owner' ||
    user.role === 'instructor' ||
    user.role === 'telemarketing'
  );
}

export function canConfirmDeposit(user: DemoUser): boolean {
  return user.role === 'owner';
}

export function canViewPayment(user: DemoUser, payment: Payment): boolean {
  if (user.role === 'owner') return true;
  if (user.role === 'instructor' || user.role === 'telemarketing') {
    return payment.collectorId === user.id;
  }
  return false;
}

export function canViewClassWideFinancialTotals(user: DemoUser): boolean {
  return user.role === 'owner';
}

export function canConfirmCashHandoff(user: DemoUser, _handoff?: CashHandoff): boolean {
  return user.role === 'owner';
}

export function canSubmitCashHandoff(user: DemoUser): boolean {
  return user.role === 'owner' || user.role === 'instructor';
}

export function canClearMissedClass(user: DemoUser): boolean {
  return user.role === 'owner';
}

export function canScheduleMakeup(user: DemoUser): boolean {
  return user.role === 'owner' || user.role === 'instructor';
}

export function canManageTours(user: DemoUser): boolean {
  return (
    user.role === 'owner' ||
    user.role === 'telemarketing' ||
    user.role === 'staff'
  );
}

export function canViewInventoryCosts(user: DemoUser): boolean {
  return user.role === 'owner';
}

export function canViewReport(user: DemoUser, report: WeeklyReport): boolean {
  if (user.role === 'owner') return true;
  return report.submittedByUserId === user.id;
}

export function canManageReports(user: DemoUser): boolean {
  return user.role === 'owner';
}

export function canViewMeeting(user: DemoUser, meeting: Meeting): boolean {
  if (user.role === 'owner') return true;
  if (meeting.visibility === 'owner_only') return false;
  return meeting.attendeeIds.includes(user.id);
}

export function canManageSuggestions(user: DemoUser): boolean {
  return user.role === 'owner';
}
