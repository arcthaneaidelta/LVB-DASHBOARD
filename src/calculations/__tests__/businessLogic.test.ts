import { describe, expect, it } from 'vitest';
import {
  calculateBehindSchedule,
  calculateDueForWeek,
  getStudentFinancialSummary,
  validatePaymentInput,
} from '../paymentEngine';
import {
  canAccessModule,
  canClearMissedClass,
  canConfirmCashHandoff,
  canConfirmDeposit,
  canTakeDeposit,
  canViewBehindSchedule,
  canViewInventoryCosts,
  canViewMeeting,
  canViewStudentFinancials,
} from '../../permissions/permissions';
import { DEMO_USERS } from '../../data/seed/demo-users';
import { DEMO_CLASSES } from '../../data/seed/demo-classes';
import { DEMO_STUDENTS } from '../../data/seed/demo-students';
import { DEMO_INVENTORY } from '../../data/seed/demo-inventory';
import { DEMO_MEETINGS, DEMO_PAYMENTS } from '../../data/seed/demo-operations';
import { getStockStatus } from '../../features/inventory/InventoryPage';
import type { Payment, Student } from '../../types';

const baseStudent: Student = {
  id: 'test-stu',
  fullName: 'Test Student',
  phone: '(323) 555-0000',
  email: 'test@example.com',
  program: 'Nail Technician Foundations',
  classId: 'class-tue-nails',
  courseTotal: 250,
  depositExpected: 50,
  firstClassPayment: 50,
  fixedWeeklyAmount: null,
  enrollmentStatus: 'enrolled',
  enrollmentDate: '2026-10-20',
  schoolAccess: true,
  googleReview: false,
  source: 'Studio Tour',
  enrolledByUserId: 'user-jessica',
  enrolledByName: 'Jessica',
  accommodations: '',
  notes: '',
  checklist: {
    depositConfirmed: true,
    webSubscriptionConfirmed: true,
    welcomeEmailSent: true,
    attendanceConfirmedBySidney: true,
  },
};

function makePayment(overrides: Partial<Payment>): Payment {
  return {
    id: `p-${Math.random()}`,
    receiptNumber: 'LVB-00999',
    studentId: baseStudent.id,
    classId: 'class-tue-nails',
    week: 1,
    date: '2026-11-03',
    amount: 50,
    method: 'cash',
    category: 'weekly',
    collectorId: 'user-marisol',
    collectorName: 'Marisol',
    notes: '',
    createdAt: '2026-11-03T18:00:00Z',
    status: 'confirmed',
    locked: false,
    ...overrides,
  };
}

describe('LVB Pulse Payment Engine (PRD Section 11 & 34.2)', () => {
  it('calculates the exact $250 example ($50 deposit, $50 Week 1, five remaining weeks of $30 = $250)', () => {
    const payments: Payment[] = [
      makePayment({ category: 'deposit', week: 0, amount: 50 }),
    ];

    // Week 1 due = $50 first-class payment
    expect(
      calculateDueForWeek({ student: baseStudent, courseWeeks: 6, targetWeek: 1, payments })
    ).toBe(50);

    // After paying Week 1 ($50), Week 2..6 should each be $30
    payments.push(makePayment({ category: 'first_class', week: 1, amount: 50 }));
    for (let w = 2; w <= 6; w++) {
      const due = calculateDueForWeek({
        student: baseStudent,
        courseWeeks: 6,
        targetWeek: w,
        payments,
      });
      expect(due).toBe(30);
      payments.push(makePayment({ category: 'weekly', week: w, amount: due }));
    }

    const summary = getStudentFinancialSummary(
      baseStudent,
      DEMO_CLASSES[0],
      payments,
      [],
      6
    );
    expect(summary.totalPaid).toBe(250);
    expect(summary.remainingBalance).toBe(0);
    expect(summary.isFullyPaid).toBe(true);
  });

  it('reduces subsequent weekly dues when a student overpays', () => {
    const payments: Payment[] = [
      makePayment({ category: 'deposit', week: 0, amount: 50 }),
      makePayment({ category: 'first_class', week: 1, amount: 50 }),
      makePayment({ category: 'weekly', week: 2, amount: 50 }), // Overpaid by $20
    ];
    // Remaining after Week 2 = 250 - 50 - 100 = 100 across 4 weeks (W3..W6) = $25/wk
    expect(
      calculateDueForWeek({ student: baseStudent, courseWeeks: 6, targetWeek: 3, payments })
    ).toBe(25);
  });

  it('carries unpaid balance forward when a student skips a week', () => {
    const payments: Payment[] = [
      makePayment({ category: 'deposit', week: 0, amount: 50 }),
      makePayment({ category: 'first_class', week: 1, amount: 50 }),
      // Skipped Week 2 ($0 paid)
    ];
    // Remaining at Week 3 = (250 - 50 - 50) / (6 - 3 + 1) = 150 / 4 = $37.50
    expect(
      calculateDueForWeek({ student: baseStudent, courseWeeks: 6, targetWeek: 3, payments })
    ).toBe(37.5);
  });

  it('respects a fixed weekly payment override plan', () => {
    const fixedStudent: Student = { ...baseStudent, fixedWeeklyAmount: 37.5 };
    const payments: Payment[] = [
      makePayment({ category: 'deposit', week: 0, amount: 50 }),
      makePayment({ category: 'first_class', week: 1, amount: 50 }),
    ];
    expect(
      calculateDueForWeek({ student: fixedStudent, courseWeeks: 6, targetWeek: 2, payments })
    ).toBe(37.5);
  });

  it('calculates behind-schedule per PRD Section 11.5 and caps expected at course total', () => {
    const payments: Payment[] = [
      makePayment({ category: 'deposit', week: 0, amount: 50 }),
      makePayment({ category: 'first_class', week: 1, amount: 50 }),
    ];
    // Week 4 started: expected = 50 + 50 + 30*(4-1) = 190; paid = 100 -> behind = 90
    const res = calculateBehindSchedule({
      student: baseStudent,
      courseWeeks: 6,
      weeksStarted: 4,
      payments,
    });
    expect(res.dueToDate).toBe(190);
    expect(res.behindSchedule).toBe(90);

    // Cap at courseTotal even if weeksStarted exceeds duration
    const capped = calculateBehindSchedule({
      student: baseStudent,
      courseWeeks: 6,
      weeksStarted: 10,
      payments,
    });
    expect(capped.dueToDate).toBe(250);
  });

  it('rejects zero, negative, and over-balance payments', () => {
    const cls = DEMO_CLASSES[0];
    expect(
      validatePaymentInput({
        amount: 0,
        date: '2026-11-24',
        student: baseStudent,
        academyClass: cls,
        remainingBalance: 100,
      }).valid
    ).toBe(false);

    expect(
      validatePaymentInput({
        amount: -20,
        date: '2026-11-24',
        student: baseStudent,
        academyClass: cls,
        remainingBalance: 100,
      }).valid
    ).toBe(false);

    expect(
      validatePaymentInput({
        amount: 150,
        date: '2026-11-24',
        student: baseStudent,
        academyClass: cls,
        remainingBalance: 100,
      }).valid
    ).toBe(false);
  });
});

describe('LVB Pulse Seed Data Integrity & Permissions Matrix (PRD Sections 21, 29, 34.3)', () => {
  it('seeds exactly 6 users, 2 classes, 14 students, 101 inventory items, and unique sequential receipts', () => {
    expect(DEMO_USERS).toHaveLength(6);
    expect(DEMO_CLASSES).toHaveLength(2);
    expect(DEMO_STUDENTS).toHaveLength(14);
    expect(DEMO_INVENTORY).toHaveLength(101);

    const receiptSet = new Set(DEMO_PAYMENTS.map((p) => p.receiptNumber));
    expect(receiptSet.size).toBe(DEMO_PAYMENTS.length);
  });

  it('enforces inventory stock thresholds (<=5 Order Now, <10 Reorder Soon, >=10 Normal)', () => {
    expect(getStockStatus(0)).toBe('order_now');
    expect(getStockStatus(5)).toBe('order_now');
    expect(getStockStatus(6)).toBe('reorder_soon');
    expect(getStockStatus(9)).toBe('reorder_soon');
    expect(getStockStatus(10)).toBe('normal');
  });

  it('enforces all 4 role permissions accurately', () => {
    const rudy = DEMO_USERS.find((u) => u.id === 'user-rudy')!;
    const marisol = DEMO_USERS.find((u) => u.id === 'user-marisol')!;
    const jessica = DEMO_USERS.find((u) => u.id === 'user-jessica')!;
    const lizy = DEMO_USERS.find((u) => u.id === 'user-lizy')!;

    // Owner Dashboard & Accounting
    expect(canAccessModule(rudy, 'dashboard')).toBe(true);
    expect(canAccessModule(marisol, 'dashboard')).toBe(false);
    expect(canAccessModule(jessica, 'accounting')).toBe(false);
    expect(canAccessModule(lizy, 'accounting')).toBe(false);

    // Deposits & Cash Confirmation
    expect(canTakeDeposit(rudy)).toBe(true);
    expect(canTakeDeposit(marisol)).toBe(true);
    expect(canTakeDeposit(jessica)).toBe(true);
    expect(canTakeDeposit(lizy)).toBe(false);

    expect(canConfirmDeposit(rudy)).toBe(true);
    expect(canConfirmDeposit(marisol)).toBe(false);
    expect(canConfirmCashHandoff(rudy)).toBe(true);
    expect(canConfirmCashHandoff(marisol)).toBe(false);
    expect(canClearMissedClass(rudy)).toBe(true);
    expect(canClearMissedClass(marisol)).toBe(false);

    // Behind-schedule & Inventory Costs: Owner Only
    expect(canViewBehindSchedule(rudy)).toBe(true);
    expect(canViewBehindSchedule(marisol)).toBe(false);
    expect(canViewBehindSchedule(lizy)).toBe(false);
    expect(canViewInventoryCosts(rudy)).toBe(true);
    expect(canViewInventoryCosts(marisol)).toBe(false);
    expect(canViewInventoryCosts(lizy)).toBe(false);

    // Configurable Telemarketing balance policy
    expect(canViewStudentFinancials(jessica, { telemarketingCanSeeBalances: false })).toBe(false);
    expect(canViewStudentFinancials(jessica, { telemarketingCanSeeBalances: true })).toBe(true);

    // Owner-only meeting hidden from non-owners
    const ownerMeeting = DEMO_MEETINGS.find((m) => m.visibility === 'owner_only')!;
    expect(canViewMeeting(rudy, ownerMeeting)).toBe(true);
    expect(canViewMeeting(marisol, ownerMeeting)).toBe(false);
    expect(canViewMeeting(lizy, ownerMeeting)).toBe(false);
  });
});
