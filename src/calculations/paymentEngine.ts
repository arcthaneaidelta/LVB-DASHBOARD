import type {
  AcademyClass,
  Deposit,
  Payment,
  PaymentMethod,
  Student,
} from '../types';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number, language: 'en' | 'es' = 'en'): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatCurrencyExact(value: number, language: 'en' | 'es' = 'en'): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatReceiptNumber(sequence: number): string {
  return `LVB-${String(sequence).padStart(5, '0')}`;
}

export interface StudentFinancialSummary {
  courseTotal: number;
  confirmedDeposit: number;
  pendingDeposit: number;
  firstClassExpected: number;
  weeklyScheduledAmount: number;
  totalPaid: number;
  remainingBalance: number;
  dueThisWeek: number;
  dueToDate: number;
  behindSchedule: number;
  paidInCurrentWeek: number;
  isFullyPaid: boolean;
}

/**
 * Confirmed payments for a student (excludes void and pending).
 */
export function getStudentConfirmedPayments(
  studentId: string,
  payments: Payment[]
): Payment[] {
  return payments.filter(
    (p) => p.studentId === studentId && p.status === 'confirmed'
  );
}

/**
 * Confirmed deposit total for a student.
 * Derived strictly from confirmed deposit payments so there is never double counting.
 */
export function getConfirmedDepositAmount(
  studentId: string,
  payments: Payment[]
): number {
  const total = payments
    .filter(
      (p) =>
        p.studentId === studentId &&
        p.status === 'confirmed' &&
        p.category === 'deposit'
    )
    .reduce((sum, p) => sum + p.amount, 0);
  return roundCurrency(total);
}

/**
 * Pending deposits awaiting owner confirmation.
 */
export function getPendingDepositAmount(
  studentId: string,
  deposits: Deposit[]
): number {
  const total = deposits
    .filter((d) => d.studentId === studentId && d.status === 'pending')
    .reduce((sum, d) => sum + d.amount, 0);
  return roundCurrency(total);
}

/**
 * Dynamic weekly due calculation per PRD Section 11.3:
 *
 *   due_w = (total - deposit - paid_before_week_w) / (weeks - w + 1)
 *
 * Where:
 * - total = course total
 * - deposit = confirmed deposit
 * - paid_before_week_w = qualifying non-deposit payments received for weeks < w
 * - weeks = course duration
 * - w = target week number (1..weeks)
 *
 * Week 1 respects `firstClassPayment` if configured.
 * If `fixedWeeklyAmount` is configured, uses the fixed weekly amount (capped at remaining balance).
 */
export function calculateDueForWeek(params: {
  student: Student;
  courseWeeks: number;
  targetWeek: number;
  payments: Payment[];
}): number {
  const { student, courseWeeks, targetWeek, payments } = params;
  const weeks = Math.max(1, courseWeeks);
  const w = Math.max(1, Math.min(targetWeek, weeks));

  const confirmedPayments = getStudentConfirmedPayments(student.id, payments);
  const confirmedDeposit = getConfirmedDepositAmount(student.id, payments);
  const totalPaidAll = roundCurrency(
    confirmedPayments.reduce((sum, p) => sum + p.amount, 0)
  );
  const overallRemaining = Math.max(0, roundCurrency(student.courseTotal - totalPaidAll));

  if (overallRemaining <= 0) {
    return 0;
  }

  // Week 1 uses explicit first-class payment when configured
  if (w === 1 && student.firstClassPayment > 0) {
    const paidWeek1 = confirmedPayments
      .filter((p) => p.category !== 'deposit' && p.week === 1)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(
      0,
      roundCurrency(Math.min(overallRemaining, student.firstClassPayment - paidWeek1))
    );
  }

  // Fixed weekly override plan (e.g. 6-week course on a 5-week payment plan)
  if (student.fixedWeeklyAmount && student.fixedWeeklyAmount > 0) {
    const paidThisWeek = confirmedPayments
      .filter((p) => p.category !== 'deposit' && p.week === w)
      .reduce((sum, p) => sum + p.amount, 0);
    const remainingForWeek = Math.max(0, student.fixedWeeklyAmount - paidThisWeek);
    return roundCurrency(Math.min(overallRemaining, remainingForWeek));
  }

  // Dynamic formula: due_w = (total - deposit - paid_before_week_w) / (weeks - w + 1)
  const paidBeforeWeekW = roundCurrency(
    confirmedPayments
      .filter((p) => p.category !== 'deposit' && p.week > 0 && p.week < w)
      .reduce((sum, p) => sum + p.amount, 0)
  );

  // Use confirmed deposit if received, otherwise expected deposit when computing schedule split
  // Wait: PRD 11.3 says `deposit` is confirmed deposit.
  const remainingWeeksDenominator = Math.max(1, weeks - w + 1);
  const numerator = Math.max(0, student.courseTotal - confirmedDeposit - paidBeforeWeekW);
  const rawDue = roundCurrency(numerator / remainingWeeksDenominator);

  const paidInTargetWeek = roundCurrency(
    confirmedPayments
      .filter((p) => p.category !== 'deposit' && p.week === w)
      .reduce((sum, p) => sum + p.amount, 0)
  );

  return Math.max(
    0,
    roundCurrency(Math.min(overallRemaining, rawDue - paidInTargetWeek))
  );
}

/**
 * Expected weekly baseline amount (for display & behind-schedule formula).
 * Example: ($250 - $50 - $50) / (6 - 1) = $30/week.
 */
export function getBaselineWeeklyAmount(student: Student, courseWeeks: number): number {
  if (student.fixedWeeklyAmount && student.fixedWeeklyAmount > 0) {
    return roundCurrency(student.fixedWeeklyAmount);
  }
  const remainingWeeksAfterFirst = Math.max(1, courseWeeks - 1);
  const remainder = Math.max(
    0,
    student.courseTotal - student.depositExpected - student.firstClassPayment
  );
  return roundCurrency(remainder / remainingWeeksAfterFirst);
}

/**
 * Behind-schedule calculation per PRD Section 11.5:
 *   expected = min(courseTotal, deposit + first_class_payment + weekly_amount * (weeks_started - 1))
 *   behind = max(0, expected - actually_paid)
 */
export function calculateBehindSchedule(params: {
  student: Student;
  courseWeeks: number;
  weeksStarted: number;
  payments: Payment[];
}): { dueToDate: number; behindSchedule: number } {
  const { student, courseWeeks, weeksStarted, payments } = params;
  const started = Math.max(0, weeksStarted);
  const weeklyAmount = getBaselineWeeklyAmount(student, courseWeeks);

  let expectedToDate = 0;
  if (started === 0) {
    expectedToDate = student.depositExpected;
  } else {
    expectedToDate =
      student.depositExpected +
      student.firstClassPayment +
      weeklyAmount * Math.max(0, started - 1);
  }

  const cappedExpected = roundCurrency(Math.min(student.courseTotal, expectedToDate));
  const actuallyPaid = roundCurrency(
    getStudentConfirmedPayments(student.id, payments).reduce(
      (sum, p) => sum + p.amount,
      0
    )
  );

  const behindSchedule = Math.max(0, roundCurrency(cappedExpected - actuallyPaid));
  return {
    dueToDate: cappedExpected,
    behindSchedule,
  };
}

/**
 * Comprehensive derived financial snapshot for any student.
 */
export function getStudentFinancialSummary(
  student: Student,
  academyClass: AcademyClass | undefined,
  payments: Payment[],
  deposits: Deposit[],
  overrideWeek?: number
): StudentFinancialSummary {
  const courseWeeks = academyClass?.weeks ?? 6;
  const currentWeek = overrideWeek ?? academyClass?.currentWeek ?? 1;

  const confirmedPayments = getStudentConfirmedPayments(student.id, payments);
  const confirmedDeposit = getConfirmedDepositAmount(student.id, payments);
  const pendingDeposit = getPendingDepositAmount(student.id, deposits);
  const totalPaid = roundCurrency(
    confirmedPayments.reduce((sum, p) => sum + p.amount, 0)
  );
  const remainingBalance = Math.max(0, roundCurrency(student.courseTotal - totalPaid));

  const dueThisWeek = calculateDueForWeek({
    student,
    courseWeeks,
    targetWeek: currentWeek,
    payments,
  });

  const paidInCurrentWeek = roundCurrency(
    confirmedPayments
      .filter((p) => p.category !== 'deposit' && p.week === currentWeek)
      .reduce((sum, p) => sum + p.amount, 0)
  );

  const { dueToDate, behindSchedule } = calculateBehindSchedule({
    student,
    courseWeeks,
    weeksStarted: currentWeek,
    payments,
  });

  return {
    courseTotal: student.courseTotal,
    confirmedDeposit,
    pendingDeposit,
    firstClassExpected: student.firstClassPayment,
    weeklyScheduledAmount: getBaselineWeeklyAmount(student, courseWeeks),
    totalPaid,
    remainingBalance,
    dueThisWeek,
    dueToDate,
    behindSchedule,
    paidInCurrentWeek,
    isFullyPaid: remainingBalance <= 0.005,
  };
}

/**
 * Payment validation per PRD Section 11.8.
 */
export function validatePaymentInput(params: {
  amount: number;
  date: string;
  student: Student | undefined;
  academyClass: AcademyClass | undefined;
  remainingBalance: number;
  allowOverBalanceAdjustment?: boolean;
}): { valid: boolean; errorKey?: string; errorMessage?: string } {
  const {
    amount,
    date,
    student,
    academyClass,
    remainingBalance,
    allowOverBalanceAdjustment = false,
  } = params;

  if (!student) {
    return { valid: false, errorKey: 'invalidStudent', errorMessage: 'Please select a valid student.' };
  }
  if (!academyClass || student.classId !== academyClass.id) {
    return { valid: false, errorKey: 'invalidClass', errorMessage: 'Student is not assigned to this class.' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, errorKey: 'invalidAmount', errorMessage: 'Payment amount must be greater than $0.' };
  }
  if (!date || Number.isNaN(Date.parse(date))) {
    return { valid: false, errorKey: 'invalidDate', errorMessage: 'Please provide a valid payment date.' };
  }
  if (!allowOverBalanceAdjustment && amount > roundCurrency(remainingBalance + 0.001)) {
    return {
      valid: false,
      errorKey: 'exceedsBalance',
      errorMessage: `Amount exceeds the remaining balance of ${formatCurrencyExact(remainingBalance)}.`,
    };
  }
  return { valid: true };
}

export function isDigitalMethod(method: PaymentMethod): boolean {
  return method === 'zelle' || method === 'venmo' || method === 'cash_app';
}

export function summarizePaymentsByMethod(payments: Payment[]) {
  const confirmed = payments.filter((p) => p.status === 'confirmed');
  const totals: Record<PaymentMethod, number> = {
    cash: 0,
    card: 0,
    zelle: 0,
    venmo: 0,
    cash_app: 0,
    check: 0,
    other: 0,
  };

  let cashTotal = 0;
  let cardTotal = 0;
  let digitalTotal = 0;
  let checkOtherTotal = 0;
  let depositTotal = 0;
  let weeklyTotal = 0;
  let overallTotal = 0;

  for (const p of confirmed) {
    totals[p.method] = roundCurrency(totals[p.method] + p.amount);
    overallTotal = roundCurrency(overallTotal + p.amount);
    if (p.method === 'cash') cashTotal = roundCurrency(cashTotal + p.amount);
    else if (p.method === 'card') cardTotal = roundCurrency(cardTotal + p.amount);
    else if (isDigitalMethod(p.method)) digitalTotal = roundCurrency(digitalTotal + p.amount);
    else checkOtherTotal = roundCurrency(checkOtherTotal + p.amount);

    if (p.category === 'deposit') depositTotal = roundCurrency(depositTotal + p.amount);
    else weeklyTotal = roundCurrency(weeklyTotal + p.amount);
  }

  return {
    byMethod: totals,
    cashTotal,
    cardTotal,
    digitalTotal,
    checkOtherTotal,
    depositTotal,
    weeklyTotal,
    overallTotal,
    count: confirmed.length,
  };
}
