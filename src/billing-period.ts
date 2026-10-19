// All boundaries use the browser's local time, just like the other card periods.
export function billingPeriodStart(date: Date, day: number): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), day);
  if (start > date) start.setMonth(start.getMonth() - 1);
  return start;
}

export function addBillingPeriods(start: Date, n: number): Date {
  return new Date(start.getFullYear(), start.getMonth() + n, start.getDate());
}

export function billingPeriodEnd(start: Date): Date {
  return new Date(addBillingPeriods(start, 1).getTime() - 1);
}
