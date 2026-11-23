import { describe, expect, it } from 'vitest';
import { DICTIONARY } from '../../translations/dictionary';
import { createInitialSeedState } from '../../services/store';
import {
  formatReceiptNumber,
  getStudentFinancialSummary,
  summarizePaymentsByMethod,
} from '../paymentEngine';
import { DEMO_INVENTORY } from '../../data/seed/demo-inventory';

describe('LVB Pulse End-to-End Workflows & Translation Completeness', () => {
  it('has complete, non-empty Spanish translations for every English dictionary key', () => {
    const enKeys = Object.keys(DICTIONARY.en) as (keyof typeof DICTIONARY.en)[];
    const esKeys = Object.keys(DICTIONARY.es);
    expect(esKeys.length).toBe(enKeys.length);
    for (const key of enKeys) {
      expect(DICTIONARY.es[key]).toBeTruthy();
      expect(DICTIONARY.es[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('seeds all 5 inventory categories totaling exactly 101 products with China and Legacy Nails lead-time flags', () => {
    const categories = new Set(DEMO_INVENTORY.map((i) => i.category));
    expect(categories.size).toBe(5);
    expect(DEMO_INVENTORY.length).toBe(101);
    expect(DEMO_INVENTORY.some((i) => i.leadTimeFlag === 'china')).toBe(true);
    expect(DEMO_INVENTORY.some((i) => i.leadTimeFlag === 'legacy_nails')).toBe(true);
    expect(DEMO_INVENTORY.some((i) => i.quantity <= 5)).toBe(true);
    expect(DEMO_INVENTORY.some((i) => i.quantity > 5 && i.quantity < 10)).toBe(true);
    expect(DEMO_INVENTORY.some((i) => i.quantity >= 10)).toBe(true);
  });

  it('derives consistent initial seed financials across all 14 students and pending alerts', () => {
    const state = createInitialSeedState();

    // Catherine Alejandra Pereira Hastomir ($50 pending deposit collected by Marisol per PRD 8.5)
    const catherine = state.students.find((s) =>
      s.fullName.includes('Catherine Alejandra Pereira Hastomir')
    );
    expect(catherine).toBeTruthy();
    expect(catherine!.enrollmentStatus).toBe('pending');
    expect(catherine!.checklist.depositConfirmed).toBe(false);

    const catPendingDeposit = state.deposits.find(
      (d) => d.studentId === catherine!.id && d.status === 'pending'
    );
    expect(catPendingDeposit).toBeTruthy();
    expect(catPendingDeposit!.amount).toBe(50);
    expect(catPendingDeposit!.collectorName).toBe('Marisol');

    // Before owner confirms deposit, pending deposit is NOT counted in confirmed totalPaid
    const cls = state.classes.find((c) => c.id === catherine!.classId)!;
    const beforeSummary = getStudentFinancialSummary(
      catherine!,
      cls,
      state.payments,
      state.deposits
    );
    expect(beforeSummary.confirmedDeposit).toBe(0);
    expect(beforeSummary.pendingDeposit).toBe(50);
    expect(beforeSummary.totalPaid).toBe(0);

    // Valeria Mendoza Cruz follows the exact $250 ($50 dep, $50 W1, $30 W2, $30 W3, $30 W4) plan
    const valeria = state.students.find((s) =>
      s.fullName.includes('Valeria Mendoza Cruz')
    )!;
    const valSummary = getStudentFinancialSummary(
      valeria,
      cls,
      state.payments,
      state.deposits,
      4
    );
    expect(valSummary.confirmedDeposit).toBe(50);
    expect(valSummary.totalPaid).toBe(190); // 50 + 50 + 30 + 30 + 30
    expect(valSummary.remainingBalance).toBe(60); // W5 $30 + W6 $30
    expect(valSummary.behindSchedule).toBe(0);

    // Sequential receipt numbers start around #31 and nextReceiptNumber continues without collision
    const existingReceipts = new Set([
      ...state.payments.map((p) => p.receiptNumber),
      ...state.deposits.map((d) => d.receiptNumber),
    ]);
    expect(existingReceipts.has('LVB-00031')).toBe(true);
    expect(existingReceipts.has(formatReceiptNumber(state.nextReceiptNumber))).toBe(false);

    // Marisol has unsubmitted 2026-11-24 payments ready for Cash Handoff demo (Scenario B)
    const marisolToday = state.payments.filter(
      (p) =>
        p.collectorId === 'user-marisol' &&
        p.date === '2026-11-24' &&
        !p.cashHandoffId
    );
    expect(marisolToday.length).toBeGreaterThanOrEqual(2);
    const sumToday = summarizePaymentsByMethod(marisolToday);
    expect(sumToday.cashTotal).toBe(30);
    expect(sumToday.digitalTotal).toBe(25);
    expect(sumToday.overallTotal).toBe(55);
  });
});
