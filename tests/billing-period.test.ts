import { billingPeriodStart, billingPeriodEnd, addBillingPeriods } from '../src/billing-period';

describe('billing periods in local time', () => {
  it.each([
    [new Date(2026, 0, 4, 12), 5, new Date(2025, 11, 5)],
    [new Date(2026, 0, 5), 5, new Date(2026, 0, 5)],
    [new Date(2026, 0, 31, 23), 1, new Date(2026, 0, 1)],
    [new Date(2024, 1, 27, 23, 59), 28, new Date(2024, 0, 28)],
    [new Date(2024, 1, 29, 12), 28, new Date(2024, 1, 28)],
  ])('finds the period containing %s with start day %s', (date, day, expected) => {
    const start = billingPeriodStart(date, day);
    expect(start).toEqual(expected);
    expect(start.getTime()).toBeLessThanOrEqual(date.getTime());
    expect(billingPeriodEnd(start).getTime()).toBeGreaterThanOrEqual(date.getTime());
  });

  it.each([
    [new Date(2024, 1, 1), new Date(2024, 1, 29, 23, 59, 59, 999)],
    [new Date(2025, 1, 1), new Date(2025, 1, 28, 23, 59, 59, 999)],
    [new Date(2024, 1, 28), new Date(2024, 2, 27, 23, 59, 59, 999)],
    [new Date(2026, 11, 28), new Date(2027, 0, 27, 23, 59, 59, 999)],
  ])('ends immediately before the next boundary: %s', (start, end) => {
    expect(billingPeriodEnd(start)).toEqual(end);
    expect(addBillingPeriods(start, 1).getTime() - billingPeriodEnd(start).getTime()).toBe(1);
  });

  it('navigates months in both directions across years and leap February', () => {
    const start = new Date(2024, 0, 28);
    expect(addBillingPeriods(start, -1)).toEqual(new Date(2023, 11, 28));
    expect(addBillingPeriods(start, 2)).toEqual(new Date(2024, 2, 28));
    expect(addBillingPeriods(addBillingPeriods(start, 1), -1)).toEqual(start);
  });
});
