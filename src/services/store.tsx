import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  AcademyClass,
  ActivityItem,
  AppState,
  AttendanceStatus,
  CashHandoff,
  DemoUser,
  Deposit,
  EnrollmentChecklist,
  Language,
  Meeting,
  MakeupStatus,
  Payment,
  PaymentCategory,
  PaymentMethod,
  PolicySettings,
  Project,
  Student,
  StudioTour,
  Suggestion,
  SuggestionStatus,
  Task,
  WeeklyReport,
} from '../types';
import { DEMO_USERS } from '../data/seed/demo-users';
import { DEMO_CLASSES } from '../data/seed/demo-classes';
import { DEMO_STUDENTS } from '../data/seed/demo-students';
import { DEMO_INVENTORY } from '../data/seed/demo-inventory';
import {
  DEMO_ACTIVITIES,
  DEMO_ATTENDANCE,
  DEMO_CASH_HANDOFFS,
  DEMO_CLASS_LOG_SUBMISSIONS,
  DEMO_DEPOSITS,
  DEMO_MEETINGS,
  DEMO_MISSED_CLASSES,
  DEMO_PAYMENTS,
  DEMO_PROJECTS,
  DEMO_REPORTS,
  DEMO_SUGGESTIONS,
  DEMO_TASKS,
  DEMO_TOURS,
} from '../data/seed/demo-operations';
import {
  formatReceiptNumber,
  getStudentFinancialSummary,
  roundCurrency,
  summarizePaymentsByMethod,
  validatePaymentInput,
} from '../calculations/paymentEngine';
import { translate, type TranslationKey } from '../translations/dictionary';

const STORAGE_KEY = 'lvb_pulse_demo_state_v1';

export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'warning' | 'error';
}

export function createInitialSeedState(): AppState {
  return {
    currentUserId: null,
    language: 'en',
    nextReceiptNumber: 80, // LVB-00080 next after seeded #31..#79
    policy: {
      telemarketingCanSeeBalances: false, // Default per PRD 7.3
    },
    users: DEMO_USERS,
    classes: DEMO_CLASSES,
    students: DEMO_STUDENTS,
    payments: DEMO_PAYMENTS,
    deposits: DEMO_DEPOSITS,
    attendance: DEMO_ATTENDANCE,
    classLogSubmissions: DEMO_CLASS_LOG_SUBMISSIONS,
    cashHandoffs: DEMO_CASH_HANDOFFS,
    missedClasses: DEMO_MISSED_CLASSES,
    tours: DEMO_TOURS,
    reports: DEMO_REPORTS,
    tasks: DEMO_TASKS,
    projects: DEMO_PROJECTS,
    inventory: DEMO_INVENTORY,
    meetings: DEMO_MEETINGS,
    suggestions: DEMO_SUGGESTIONS,
    activities: DEMO_ACTIVITIES,
  };
}

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSeedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.inventory)) {
      return createInitialSeedState();
    }
    return parsed;
  } catch {
    return createInitialSeedState();
  }
}

interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface AppContextValue {
  state: AppState;
  currentUser: DemoUser | null;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  pushToast: (message: string, tone?: ToastItem['tone']) => void;
  t: (key: TranslationKey) => string;

  // Identity & Language & Policy
  selectUser: (userId: string | null) => void;
  setLanguage: (lang: Language) => void;
  updatePolicy: (patch: Partial<PolicySettings>) => void;
  resetDemoData: () => void;

  // Classes
  createClass: (input: Omit<AcademyClass, 'id'>) => ActionResult<AcademyClass>;
  updateClass: (id: string, patch: Partial<AcademyClass>) => ActionResult;

  // Students
  createStudent: (
    input: Omit<Student, 'id' | 'checklist' | 'enrollmentStatus' | 'enrolledByUserId' | 'enrolledByName'>
  ) => ActionResult<Student>;
  updateStudent: (id: string, patch: Partial<Student>) => ActionResult;
  toggleChecklistItem: (studentId: string, key: keyof EnrollmentChecklist) => ActionResult;

  // Payments & Deposits
  createPayment: (input: {
    studentId: string;
    classId: string;
    week: number;
    date: string;
    amount: number;
    method: PaymentMethod;
    category: PaymentCategory;
    notes?: string;
    allowOverBalanceAdjustment?: boolean;
  }) => ActionResult<Payment>;
  createDeposit: (input: {
    studentId: string;
    classId: string;
    amount: number;
    method: PaymentMethod;
    date: string;
    notes?: string;
  }) => ActionResult<Deposit>;
  confirmDeposit: (depositId: string) => ActionResult;

  // Attendance & Class Logs
  recordAttendance: (input: {
    studentId: string;
    classId: string;
    week: number;
    date: string;
    status: AttendanceStatus;
    notes?: string;
  }) => ActionResult;
  submitClassLog: (classId: string, week: number, date: string) => ActionResult;

  // Cash Handoffs
  submitCashHandoff: (date: string, collectorId?: string) => ActionResult<CashHandoff>;
  confirmCashHandoff: (handoffId: string, receivedCash: number) => ActionResult;
  flagCashHandoff: (handoffId: string, receivedCash: number, flagNote: string) => ActionResult;

  // Missed Classes
  updateMissedClass: (
    id: string,
    patch: { makeupStatus?: MakeupStatus; scheduledMakeupDate?: string; notes?: string }
  ) => ActionResult;
  clearMissedClass: (id: string) => ActionResult;

  // Studio Tours
  createTour: (input: Omit<StudioTour, 'id'>) => ActionResult<StudioTour>;
  updateTour: (id: string, patch: Partial<StudioTour>) => ActionResult;

  // Weekly Reports
  createReport: (
    input: Omit<WeeklyReport, 'id' | 'submittedByUserId' | 'submittedByName' | 'status' | 'updatedAt'>
  ) => ActionResult<WeeklyReport>;
  updateReport: (id: string, patch: Partial<WeeklyReport>) => ActionResult;

  // Tasks & Projects
  createTask: (input: Omit<Task, 'id' | 'createdById' | 'createdByName'>) => ActionResult<Task>;
  updateTask: (id: string, patch: Partial<Task>) => ActionResult;
  createProject: (input: Omit<Project, 'id'>) => ActionResult<Project>;
  updateProject: (id: string, patch: Partial<Project>) => ActionResult;

  // Inventory
  updateInventoryQuantity: (productId: string, newQuantity: number, notes?: string) => ActionResult;

  // Meetings
  createMeeting: (input: Omit<Meeting, 'id' | 'createdByUserId'>) => ActionResult<Meeting>;

  // Suggestions
  createSuggestion: (
    input: Omit<Suggestion, 'id' | 'suggestedByUserId' | 'suggestedByName' | 'status' | 'date'>
  ) => ActionResult<Suggestion>;
  updateSuggestion: (id: string, status: SuggestionStatus, ownerNotes?: string) => ActionResult;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function appendActivity(activities: ActivityItem[], item: Omit<ActivityItem, 'id' | 'timestamp'>): ActivityItem[] {
  return [
    {
      ...item,
      id: uid('act'),
      timestamp: new Date().toISOString(),
    },
    ...activities,
  ].slice(0, 60);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [state]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId]
  );

  const t = useCallback(
    (key: TranslationKey) => translate(state.language, key),
    [state.language]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastItem['tone'] = 'success') => {
      const id = uid('toast');
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3800);
    },
    []
  );

  const selectUser = useCallback((userId: string | null) => {
    setState((prev) => ({ ...prev, currentUserId: userId }));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setState((prev) => ({ ...prev, language: lang }));
  }, []);

  const updatePolicy = useCallback((patch: Partial<PolicySettings>) => {
    setState((prev) => ({
      ...prev,
      policy: { ...prev.policy, ...patch },
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialSeedState();
    fresh.currentUserId = state.currentUserId;
    fresh.language = state.language;
    setState(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    pushToast(translate(state.language, 'toastDemoReset'), 'info');
  }, [state.currentUserId, state.language, pushToast]);

  const createClass: AppContextValue['createClass'] = useCallback(
    (input) => {
      if (!input.name.trim() || !input.program.trim() || input.weeks < 1 || !input.startDate) {
        return { ok: false, error: 'Please complete all required class fields.' };
      }
      if (input.instructorIds.length === 0) {
        return { ok: false, error: 'Assign at least one instructor.' };
      }
      const created: AcademyClass = { ...input, id: uid('class') };
      setState((prev) => ({
        ...prev,
        classes: [...prev.classes, created],
        users: prev.users.map((u) =>
          input.instructorIds.includes(u.id) && !u.assignedClassIds.includes(created.id)
            ? { ...u, assignedClassIds: [...u.assignedClassIds, created.id] }
            : u
        ),
        activities: appendActivity(prev.activities, {
          type: 'enrollment',
          title: `Class created: ${created.name}`,
          detail: `${created.program} · ${created.weekday} (${created.weeks} weeks)`,
          actorName: currentUser?.name ?? 'Owner',
          targetRoute: '/app/classes',
          targetId: created.id,
        }),
      }));
      pushToast(`Class "${created.name}" created.`);
      return { ok: true, data: created };
    },
    [currentUser, pushToast]
  );

  const updateClass: AppContextValue['updateClass'] = useCallback((id, patch) => {
    setState((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    return { ok: true };
  }, []);

  const createStudent: AppContextValue['createStudent'] = useCallback(
    (input) => {
      if (!input.fullName.trim() || !input.classId) {
        return { ok: false, error: 'Student name and assigned class are required.' };
      }
      if (input.courseTotal <= 0) {
        return { ok: false, error: 'Course total must be greater than $0.' };
      }
      const created: Student = {
        ...input,
        id: uid('stu'),
        enrollmentStatus: 'pending',
        enrolledByUserId: currentUser?.id ?? 'user-rudy',
        enrolledByName: currentUser?.name ?? 'Rudy Figueroa',
        checklist: {
          depositConfirmed: false,
          webSubscriptionConfirmed: false,
          welcomeEmailSent: false,
          attendanceConfirmedBySidney: false,
        },
      };
      setState((prev) => ({
        ...prev,
        students: [created, ...prev.students],
        activities: appendActivity(prev.activities, {
          type: 'enrollment',
          title: `New student enrolled: ${created.fullName}`,
          detail: `${created.program} · $${created.courseTotal} tuition`,
          actorName: currentUser?.name ?? 'System',
          targetRoute: '/app/students',
          targetId: created.id,
        }),
      }));
      pushToast(translate(state.language, 'toastStudentCreated'));
      return { ok: true, data: created };
    },
    [currentUser, pushToast, state.language]
  );

  const updateStudent: AppContextValue['updateStudent'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));
      pushToast(translate(state.language, 'toastStudentUpdated'));
      return { ok: true };
    },
    [pushToast, state.language]
  );

  const toggleChecklistItem: AppContextValue['toggleChecklistItem'] = useCallback(
    (studentId, key) => {
      let becameFullyEnrolled = false;
      setState((prev) => {
        const nextStudents = prev.students.map((s) => {
          if (s.id !== studentId) return s;
          const nextChecklist = { ...s.checklist, [key]: !s.checklist[key] };
          const allFourDone =
            nextChecklist.depositConfirmed &&
            nextChecklist.webSubscriptionConfirmed &&
            nextChecklist.welcomeEmailSent &&
            nextChecklist.attendanceConfirmedBySidney;
          let nextStatus = s.enrollmentStatus;
          if (allFourDone && s.enrollmentStatus === 'pending') {
            nextStatus = 'enrolled';
            becameFullyEnrolled = true;
          } else if (!allFourDone && s.enrollmentStatus === 'enrolled') {
            nextStatus = 'pending';
          }
          return { ...s, checklist: nextChecklist, enrollmentStatus: nextStatus };
        });

        const student = prev.students.find((s) => s.id === studentId);
        return {
          ...prev,
          students: nextStudents,
          activities: becameFullyEnrolled && student
            ? appendActivity(prev.activities, {
                type: 'enrollment',
                title: `Enrollment completed: ${student.fullName}`,
                detail: 'All 4 checklist items verified — status moved to Fully Enrolled',
                actorName: currentUser?.name ?? 'System',
                targetRoute: '/app/students',
                targetId: student.id,
              })
            : prev.activities,
        };
      });

      if (becameFullyEnrolled) {
        pushToast(translate(state.language, 'toastStudentFullyEnrolled'));
      }
      return { ok: true };
    },
    [currentUser, pushToast, state.language]
  );

  const createPayment: AppContextValue['createPayment'] = useCallback(
    (input) => {
      const student = state.students.find((s) => s.id === input.studentId);
      const academyClass = state.classes.find((c) => c.id === input.classId);
      const summary = student
        ? getStudentFinancialSummary(student, academyClass, state.payments, state.deposits)
        : null;

      const check = validatePaymentInput({
        amount: input.amount,
        date: input.date,
        student,
        academyClass,
        remainingBalance: summary?.remainingBalance ?? 0,
        allowOverBalanceAdjustment: input.allowOverBalanceAdjustment,
      });

      if (!check.valid) {
        pushToast(check.errorMessage ?? 'Invalid payment.', 'error');
        return { ok: false, error: check.errorMessage };
      }

      const receiptNumber = formatReceiptNumber(state.nextReceiptNumber);
      // Ensure uniqueness
      if (state.payments.some((p) => p.receiptNumber === receiptNumber)) {
        return { ok: false, error: 'Duplicate receipt number detected.' };
      }

      const payment: Payment = {
        id: uid('pay'),
        receiptNumber,
        studentId: input.studentId,
        classId: input.classId,
        week: input.week,
        date: input.date,
        amount: roundCurrency(input.amount),
        method: input.method,
        category: input.category,
        collectorId: currentUser?.id ?? 'user-rudy',
        collectorName: currentUser?.name ?? 'Rudy Figueroa',
        notes: input.notes ?? '',
        createdAt: new Date().toISOString(),
        status: 'confirmed',
        locked: false,
      };

      setState((prev) => ({
        ...prev,
        nextReceiptNumber: prev.nextReceiptNumber + 1,
        payments: [payment, ...prev.payments],
        activities: appendActivity(prev.activities, {
          type: 'payment',
          title: `Payment recorded (${payment.receiptNumber})`,
          detail: `${student?.fullName ?? ''} — $${payment.amount.toFixed(2)} via ${payment.method} (Week ${payment.week})`,
          actorName: payment.collectorName,
          targetRoute: '/app/payments',
          targetId: payment.id,
        }),
      }));
      pushToast(translate(state.language, 'toastPaymentRecorded'));
      return { ok: true, data: payment };
    },
    [state.students, state.classes, state.payments, state.deposits, state.nextReceiptNumber, state.language, currentUser, pushToast]
  );

  const createDeposit: AppContextValue['createDeposit'] = useCallback(
    (input) => {
      const student = state.students.find((s) => s.id === input.studentId);
      const academyClass = state.classes.find((c) => c.id === input.classId);
      if (!student || !academyClass) {
        return { ok: false, error: 'Please select a valid student and class.' };
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        return { ok: false, error: 'Deposit amount must be greater than $0.' };
      }
      if (!input.date) {
        return { ok: false, error: 'Please select a valid date.' };
      }

      const receiptNumber = formatReceiptNumber(state.nextReceiptNumber);
      const deposit: Deposit = {
        id: uid('dep'),
        receiptNumber,
        studentId: input.studentId,
        classId: input.classId,
        amount: roundCurrency(input.amount),
        method: input.method,
        date: input.date,
        collectorId: currentUser?.id ?? 'user-jessica',
        collectorName: currentUser?.name ?? 'Jessica',
        notes: input.notes ?? '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        nextReceiptNumber: prev.nextReceiptNumber + 1,
        deposits: [deposit, ...prev.deposits],
        activities: appendActivity(prev.activities, {
          type: 'deposit_received',
          title: `Deposit awaiting owner confirmation (${deposit.receiptNumber})`,
          detail: `${student.fullName} — $${deposit.amount.toFixed(2)} via ${deposit.method}`,
          actorName: deposit.collectorName,
          targetRoute: '/app/payments',
          targetId: deposit.id,
        }),
      }));
      pushToast(translate(state.language, 'toastDepositRecorded'), 'info');
      return { ok: true, data: deposit };
    },
    [state.students, state.classes, state.nextReceiptNumber, state.language, currentUser, pushToast]
  );

  const confirmDeposit: AppContextValue['confirmDeposit'] = useCallback(
    (depositId) => {
      if (currentUser?.role !== 'owner') {
        return { ok: false, error: 'Only owners can confirm deposits.' };
      }
      const deposit = state.deposits.find((d) => d.id === depositId);
      if (!deposit || deposit.status === 'confirmed') {
        return { ok: false, error: 'Deposit not found or already confirmed.' };
      }
      const student = state.students.find((s) => s.id === deposit.studentId);
      const now = new Date().toISOString();

      const linkedPayment: Payment = {
        id: uid('pay'),
        receiptNumber: deposit.receiptNumber,
        studentId: deposit.studentId,
        classId: deposit.classId,
        week: 0,
        date: deposit.date,
        amount: deposit.amount,
        method: deposit.method,
        category: 'deposit',
        collectorId: deposit.collectorId,
        collectorName: deposit.collectorName,
        notes: `Confirmed deposit (${deposit.notes || 'Enrollment deposit'})`,
        createdAt: now,
        status: 'confirmed',
        locked: true,
        depositId: deposit.id,
      };

      setState((prev) => {
        const nextStudents = prev.students.map((s) => {
          if (s.id !== deposit.studentId) return s;
          const nextChecklist = { ...s.checklist, depositConfirmed: true };
          const allFour =
            nextChecklist.depositConfirmed &&
            nextChecklist.webSubscriptionConfirmed &&
            nextChecklist.welcomeEmailSent &&
            nextChecklist.attendanceConfirmedBySidney;
          return {
            ...s,
            checklist: nextChecklist,
            enrollmentStatus: allFour && s.enrollmentStatus === 'pending' ? 'enrolled' : s.enrollmentStatus,
          };
        });

        return {
          ...prev,
          deposits: prev.deposits.map((d) =>
            d.id === depositId
              ? {
                  ...d,
                  status: 'confirmed',
                  confirmedByUserId: currentUser.id,
                  confirmedByName: currentUser.name,
                  confirmedAt: now,
                }
              : d
          ),
          payments: [linkedPayment, ...prev.payments],
          students: nextStudents,
          activities: appendActivity(prev.activities, {
            type: 'deposit_confirmed',
            title: `Deposit confirmed (${deposit.receiptNumber})`,
            detail: `${student?.fullName ?? ''} — $${deposit.amount.toFixed(2)} confirmed by ${currentUser.name}`,
            actorName: currentUser.name,
            targetRoute: '/app/students',
            targetId: deposit.studentId,
          }),
        };
      });
      pushToast(translate(state.language, 'toastDepositConfirmed'));
      return { ok: true };
    },
    [currentUser, state.deposits, state.students, state.language, pushToast]
  );

  const recordAttendance: AppContextValue['recordAttendance'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const existingIdx = prev.attendance.findIndex(
          (a) =>
            a.studentId === input.studentId &&
            a.classId === input.classId &&
            a.week === input.week
        );
        const updatedRecord = {
          id: existingIdx >= 0 ? prev.attendance[existingIdx].id : uid('att'),
          studentId: input.studentId,
          classId: input.classId,
          week: input.week,
          date: input.date,
          status: input.status,
          notes: input.notes ?? (existingIdx >= 0 ? prev.attendance[existingIdx].notes : ''),
          recordedByUserId: currentUser?.id ?? 'user-marisol',
          updatedAt: now,
        };
        const nextAttendance =
          existingIdx >= 0
            ? prev.attendance.map((a, i) => (i === existingIdx ? updatedRecord : a))
            : [...prev.attendance, updatedRecord];

        // PRD Section 12.3 & 17.1: Absent (A) or Excused (E) creates an open missed-class record; Cancelled (C) or Present (P) does NOT.
        let nextMissed = [...prev.missedClasses];
        const existingMissedIdx = nextMissed.findIndex(
          (m) =>
            m.studentId === input.studentId &&
            m.classId === input.classId &&
            m.originalWeek === input.week
        );

        if (input.status === 'A' || input.status === 'E') {
          if (existingMissedIdx >= 0) {
            nextMissed[existingMissedIdx] = {
              ...nextMissed[existingMissedIdx],
              attendanceStatus: input.status,
              notes: input.notes || nextMissed[existingMissedIdx].notes,
            };
          } else {
            nextMissed = [
              {
                id: uid('mc'),
                studentId: input.studentId,
                classId: input.classId,
                originalWeek: input.week,
                originalDate: input.date,
                attendanceStatus: input.status,
                makeupStatus: 'open',
                notes: input.notes || '',
              },
              ...nextMissed,
            ];
          }
        } else if (existingMissedIdx >= 0 && nextMissed[existingMissedIdx].makeupStatus === 'open') {
          // If changed from A/E to P or C while still open, remove auto-generated missed record
          nextMissed.splice(existingMissedIdx, 1);
        }

        return {
          ...prev,
          attendance: nextAttendance,
          missedClasses: nextMissed,
        };
      });
      return { ok: true };
    },
    [currentUser]
  );

  const submitClassLog: AppContextValue['submitClassLog'] = useCallback(
    (classId, week, date) => {
      const cls = state.classes.find((c) => c.id === classId);
      const now = new Date().toISOString();
      setState((prev) => {
        const exists = prev.classLogSubmissions.some(
          (s) => s.classId === classId && s.week === week
        );
        const nextSubs = exists
          ? prev.classLogSubmissions.map((s) =>
              s.classId === classId && s.week === week
                ? {
                    ...s,
                    submittedAt: now,
                    submittedByUserId: currentUser?.id ?? s.submittedByUserId,
                    submittedByName: currentUser?.name ?? s.submittedByName,
                  }
                : s
            )
          : [
              ...prev.classLogSubmissions,
              {
                id: uid('cls'),
                classId,
                week,
                date,
                submittedByUserId: currentUser?.id ?? 'user-marisol',
                submittedByName: currentUser?.name ?? 'Marisol',
                submittedAt: now,
              },
            ];
        return {
          ...prev,
          classLogSubmissions: nextSubs,
          activities: appendActivity(prev.activities, {
            type: 'attendance',
            title: `Class log submitted — Week ${week}`,
            detail: `${cls?.name ?? classId} (${date})`,
            actorName: currentUser?.name ?? 'Instructor',
            targetRoute: '/app/class-log',
            targetId: classId,
          }),
        };
      });
      pushToast(translate(state.language, 'toastClassLogSubmitted'));
      return { ok: true };
    },
    [state.classes, state.language, currentUser, pushToast]
  );

  const submitCashHandoff: AppContextValue['submitCashHandoff'] = useCallback(
    (date, collectorIdOverride) => {
      const collectorId = collectorIdOverride ?? currentUser?.id ?? 'user-marisol';
      const collector = state.users.find((u) => u.id === collectorId);
      const eligiblePayments = state.payments.filter(
        (p) =>
          p.status === 'confirmed' &&
          p.collectorId === collectorId &&
          p.date === date &&
          !p.cashHandoffId
      );

      if (eligiblePayments.length === 0) {
        pushToast('No unsubmitted payments found for this collector on this date.', 'warning');
        return { ok: false, error: 'No unsubmitted payments found for this date.' };
      }

      const summary = summarizePaymentsByMethod(eligiblePayments);
      const handoff: CashHandoff = {
        id: uid('ho'),
        date,
        collectorId,
        collectorName: collector?.name ?? currentUser?.name ?? 'Collector',
        paymentIds: eligiblePayments.map((p) => p.id),
        transactionCount: eligiblePayments.length,
        expectedCash: summary.cashTotal,
        cardTotal: summary.cardTotal,
        digitalTotal: summary.digitalTotal,
        overallTotal: summary.overallTotal,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };

      const idSet = new Set(handoff.paymentIds);
      setState((prev) => ({
        ...prev,
        cashHandoffs: [handoff, ...prev.cashHandoffs],
        payments: prev.payments.map((p) =>
          idSet.has(p.id) ? { ...p, cashHandoffId: handoff.id } : p
        ),
        activities: appendActivity(prev.activities, {
          type: 'cash_handoff',
          title: 'Cash handoff submitted for owner review',
          detail: `${handoff.collectorName} — $${handoff.expectedCash.toFixed(2)} cash ($${handoff.overallTotal.toFixed(2)} total)`,
          actorName: handoff.collectorName,
          targetRoute: '/app/cash-handoff',
          targetId: handoff.id,
        }),
      }));
      pushToast(translate(state.language, 'toastHandoffSubmitted'));
      return { ok: true, data: handoff };
    },
    [currentUser, state.users, state.payments, state.language, pushToast]
  );

  const confirmCashHandoff: AppContextValue['confirmCashHandoff'] = useCallback(
    (handoffId, receivedCash) => {
      if (currentUser?.role !== 'owner') {
        return { ok: false, error: 'Only owners can confirm cash handoffs.' };
      }
      const handoff = state.cashHandoffs.find((h) => h.id === handoffId);
      if (!handoff) return { ok: false, error: 'Cash handoff not found.' };
      if (handoff.status === 'confirmed') {
        return { ok: false, error: 'This cash handoff is already confirmed and locked.' };
      }

      const variance = roundCurrency(receivedCash - handoff.expectedCash);
      const now = new Date().toISOString();
      const idSet = new Set(handoff.paymentIds);

      setState((prev) => ({
        ...prev,
        cashHandoffs: prev.cashHandoffs.map((h) =>
          h.id === handoffId
            ? {
                ...h,
                status: 'confirmed',
                receivedCash: roundCurrency(receivedCash),
                variance,
                confirmedByUserId: currentUser.id,
                confirmedByName: currentUser.name,
                confirmedAt: now,
              }
            : h
        ),
        // Lock all associated payment entries
        payments: prev.payments.map((p) =>
          idSet.has(p.id) ? { ...p, locked: true } : p
        ),
        activities: appendActivity(prev.activities, {
          type: 'cash_handoff',
          title: 'Cash handoff confirmed & locked',
          detail: `${handoff.collectorName} (${handoff.date}) — Received $${receivedCash.toFixed(2)} (variance $${variance.toFixed(2)})`,
          actorName: currentUser.name,
          targetRoute: '/app/cash-handoff',
          targetId: handoff.id,
        }),
      }));
      pushToast(translate(state.language, 'toastHandoffConfirmed'));
      return { ok: true };
    },
    [currentUser, state.cashHandoffs, state.language, pushToast]
  );

  const flagCashHandoff: AppContextValue['flagCashHandoff'] = useCallback(
    (handoffId, receivedCash, flagNote) => {
      if (currentUser?.role !== 'owner') {
        return { ok: false, error: 'Only owners can flag cash discrepancies.' };
      }
      if (!flagNote.trim()) {
        return { ok: false, error: 'A note is required when flagging a cash discrepancy.' };
      }
      const handoff = state.cashHandoffs.find((h) => h.id === handoffId);
      if (!handoff) return { ok: false, error: 'Cash handoff not found.' };
      if (handoff.status === 'confirmed') {
        return { ok: false, error: 'Confirmed cash entries are locked.' };
      }
      const variance = roundCurrency(receivedCash - handoff.expectedCash);
      setState((prev) => ({
        ...prev,
        cashHandoffs: prev.cashHandoffs.map((h) =>
          h.id === handoffId
            ? {
                ...h,
                status: 'flagged',
                receivedCash: roundCurrency(receivedCash),
                variance,
                flagNote: flagNote.trim(),
              }
            : h
        ),
        activities: appendActivity(prev.activities, {
          type: 'cash_handoff',
          title: 'Cash handoff discrepancy flagged',
          detail: `${handoff.collectorName} (${handoff.date}) — Variance $${variance.toFixed(2)}: ${flagNote.trim()}`,
          actorName: currentUser.name,
          targetRoute: '/app/cash-handoff',
          targetId: handoff.id,
        }),
      }));
      pushToast(translate(state.language, 'toastHandoffFlagged'), 'warning');
      return { ok: true };
    },
    [currentUser, state.cashHandoffs, state.language, pushToast]
  );

  const updateMissedClass: AppContextValue['updateMissedClass'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        missedClasses: prev.missedClasses.map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
      }));
      pushToast('Missed class record updated.');
      return { ok: true };
    },
    [pushToast]
  );

  const clearMissedClass: AppContextValue['clearMissedClass'] = useCallback(
    (id) => {
      if (currentUser?.role !== 'owner') {
        return { ok: false, error: 'Owner clearance is mandatory.' };
      }
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        missedClasses: prev.missedClasses.map((m) =>
          m.id === id
            ? {
                ...m,
                makeupStatus: 'cleared',
                clearedByUserId: currentUser.id,
                clearedByName: currentUser.name,
                clearedAt: now,
              }
            : m
        ),
      }));
      pushToast('Missed class cleared by owner.');
      return { ok: true };
    },
    [currentUser, pushToast]
  );

  const createTour: AppContextValue['createTour'] = useCallback(
    (input) => {
      if (!input.visitorName.trim() || !input.date) {
        return { ok: false, error: 'Visitor name and date are required.' };
      }
      const tour: StudioTour = { ...input, id: uid('tour') };
      setState((prev) => ({
        ...prev,
        tours: [tour, ...prev.tours],
        activities: appendActivity(prev.activities, {
          type: 'tour',
          title: `Studio tour booked: ${tour.visitorName}`,
          detail: `${tour.date} at ${tour.time} · ${tour.programInterest}`,
          actorName: currentUser?.name ?? 'Staff',
          targetRoute: '/app/studio-tours',
          targetId: tour.id,
        }),
      }));
      pushToast(translate(state.language, 'toastTourSaved'));
      return { ok: true, data: tour };
    },
    [currentUser, pushToast, state.language]
  );

  const updateTour: AppContextValue['updateTour'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        tours: prev.tours.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      }));
      pushToast(translate(state.language, 'toastTourSaved'));
      return { ok: true };
    },
    [pushToast, state.language]
  );

  const createReport: AppContextValue['createReport'] = useCallback(
    (input) => {
      if (!input.subject.trim() || !input.description.trim()) {
        return { ok: false, error: 'Subject and description are required.' };
      }
      const report: WeeklyReport = {
        ...input,
        id: uid('rep'),
        submittedByUserId: currentUser?.id ?? 'user-lizy',
        submittedByName: currentUser?.name ?? 'Team Member',
        status: 'open',
        updatedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        reports: [report, ...prev.reports],
        activities: appendActivity(prev.activities, {
          type: 'report',
          title: `Weekly report submitted (${report.urgency})`,
          detail: report.subject,
          actorName: report.submittedByName,
          targetRoute: '/app/weekly-reports',
          targetId: report.id,
        }),
      }));
      pushToast(translate(state.language, 'toastReportSaved'));
      return { ok: true, data: report };
    },
    [currentUser, pushToast, state.language]
  );

  const updateReport: AppContextValue['updateReport'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
        ),
      }));
      pushToast(translate(state.language, 'toastReportSaved'));
      return { ok: true };
    },
    [pushToast, state.language]
  );

  const createTask: AppContextValue['createTask'] = useCallback(
    (input) => {
      if (!input.title.trim()) return { ok: false, error: 'Task title is required.' };
      const task: Task = {
        ...input,
        id: uid('task'),
        createdById: currentUser?.id ?? 'user-rudy',
        createdByName: currentUser?.name ?? 'Rudy Figueroa',
      };
      setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));
      pushToast(translate(state.language, 'toastTaskSaved'));
      return { ok: true, data: task };
    },
    [currentUser, pushToast, state.language]
  );

  const updateTask: AppContextValue['updateTask'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
      }));
      pushToast(translate(state.language, 'toastTaskSaved'));
      return { ok: true };
    },
    [pushToast, state.language]
  );

  const createProject: AppContextValue['createProject'] = useCallback(
    (input) => {
      if (!input.name.trim()) return { ok: false, error: 'Project name is required.' };
      const project: Project = { ...input, id: uid('proj') };
      setState((prev) => ({ ...prev, projects: [project, ...prev.projects] }));
      pushToast('Project created.');
      return { ok: true, data: project };
    },
    [pushToast]
  );

  const updateProject: AppContextValue['updateProject'] = useCallback(
    (id, patch) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      pushToast('Project updated.');
      return { ok: true };
    },
    [pushToast]
  );

  const updateInventoryQuantity: AppContextValue['updateInventoryQuantity'] = useCallback(
    (productId, newQuantity, notes) => {
      if (!Number.isFinite(newQuantity) || newQuantity < 0) {
        return { ok: false, error: 'Quantity cannot be negative.' };
      }
      const today = new Date().toISOString().slice(0, 10);
      const item = state.inventory.find((i) => i.id === productId);
      setState((prev) => ({
        ...prev,
        inventory: prev.inventory.map((p) =>
          p.id === productId
            ? {
                ...p,
                quantity: Math.floor(newQuantity),
                lastUpdated: today,
                notes: notes !== undefined ? notes : p.notes,
              }
            : p
        ),
        activities: item
          ? appendActivity(prev.activities, {
              type: 'inventory',
              title: `Inventory count updated: ${item.name}`,
              detail: `Quantity set to ${Math.floor(newQuantity)} units`,
              actorName: currentUser?.name ?? 'Team',
              targetRoute: '/app/inventory',
              targetId: productId,
            })
          : prev.activities,
      }));
      pushToast(translate(state.language, 'toastInventoryUpdated'));
      return { ok: true };
    },
    [state.inventory, state.language, currentUser, pushToast]
  );

  const createMeeting: AppContextValue['createMeeting'] = useCallback(
    (input) => {
      if (!input.title.trim() || !input.date) {
        return { ok: false, error: 'Title and date are required.' };
      }
      const meeting: Meeting = {
        ...input,
        id: uid('meet'),
        createdByUserId: currentUser?.id ?? 'user-rudy',
      };
      setState((prev) => ({ ...prev, meetings: [...prev.meetings, meeting] }));
      pushToast(translate(state.language, 'toastMeetingCreated'));
      return { ok: true, data: meeting };
    },
    [currentUser, pushToast, state.language]
  );

  const createSuggestion: AppContextValue['createSuggestion'] = useCallback(
    (input) => {
      if (!input.title.trim() || !input.description.trim()) {
        return { ok: false, error: 'Title and description are required.' };
      }
      const sug: Suggestion = {
        ...input,
        id: uid('sug'),
        suggestedByUserId: currentUser?.id ?? 'user-lizy',
        suggestedByName: currentUser?.name ?? 'Staff',
        date: new Date().toISOString().slice(0, 10),
        status: 'submitted',
      };
      setState((prev) => ({ ...prev, suggestions: [sug, ...prev.suggestions] }));
      pushToast(translate(state.language, 'toastSuggestionSubmitted'));
      return { ok: true, data: sug };
    },
    [currentUser, pushToast, state.language]
  );

  const updateSuggestion: AppContextValue['updateSuggestion'] = useCallback(
    (id, status, ownerNotes) => {
      setState((prev) => ({
        ...prev,
        suggestions: prev.suggestions.map((s) =>
          s.id === id ? { ...s, status, ownerNotes: ownerNotes ?? s.ownerNotes } : s
        ),
      }));
      pushToast('Suggestion status updated.');
      return { ok: true };
    },
    [pushToast]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      currentUser,
      toasts,
      dismissToast,
      pushToast,
      t,
      selectUser,
      setLanguage,
      updatePolicy,
      resetDemoData,
      createClass,
      updateClass,
      createStudent,
      updateStudent,
      toggleChecklistItem,
      createPayment,
      createDeposit,
      confirmDeposit,
      recordAttendance,
      submitClassLog,
      submitCashHandoff,
      confirmCashHandoff,
      flagCashHandoff,
      updateMissedClass,
      clearMissedClass,
      createTour,
      updateTour,
      createReport,
      updateReport,
      createTask,
      updateTask,
      createProject,
      updateProject,
      updateInventoryQuantity,
      createMeeting,
      createSuggestion,
      updateSuggestion,
    }),
    [
      state,
      currentUser,
      toasts,
      dismissToast,
      pushToast,
      t,
      selectUser,
      setLanguage,
      updatePolicy,
      resetDemoData,
      createClass,
      updateClass,
      createStudent,
      updateStudent,
      toggleChecklistItem,
      createPayment,
      createDeposit,
      confirmDeposit,
      recordAttendance,
      submitClassLog,
      submitCashHandoff,
      confirmCashHandoff,
      flagCashHandoff,
      updateMissedClass,
      clearMissedClass,
      createTour,
      updateTour,
      createReport,
      updateReport,
      createTask,
      updateTask,
      createProject,
      updateProject,
      updateInventoryQuantity,
      createMeeting,
      createSuggestion,
      updateSuggestion,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
