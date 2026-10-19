/* eslint-disable @typescript-eslint/no-explicit-any */
// Jest runs CommonJS; use date-fns' equivalent CommonJS entry for the card's ESM import.
jest.mock('date-fns/esm', () => jest.requireActual('date-fns'));

import { EnergyPeriodSelectorBase } from '../src/energy-period-selector-plus-base';
import { validatePeriodConfig } from '../src/energy-period-selector-plus-config';
import { billingPeriodEnd } from '../src/billing-period';
import { nothing } from 'lit';

function setup(config: Record<string, unknown> = {}) {
  const card = new EnergyPeriodSelectorBase() as any;
  const collection = { setPeriod: jest.fn(), refresh: jest.fn(), subscribe: jest.fn(() => jest.fn()), setCompare: jest.fn() };
  card.hass = {
    connection: { _energy: collection }, locale: { language: 'de', first_weekday: 'monday' },
    states: {}, callService: jest.fn().mockResolvedValue(undefined), localize: (key: string) => key,
    translationMetadata: { translations: {} },
  };
  card._config = { type: 'custom:energy-period-selector-plus', ...config };
  return { card, collection };
}
const today = () => new Date(2026, 9, 19);
const dayEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const update = (card: any, start = today(), end = dayEnd(start)) => card._updateDates({ start, end });
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 19, 12));
});
afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('component gate', () => {
  it('waits for the helper AND all four definitions before rendering', async () => {
    const { card } = setup();
    update(card);
    let completeImport!: () => void;
    let completeDefinition!: () => void;
    const importControl = jest.fn(() => new Promise<void>(resolve => { completeImport = resolve; }));
    (window as any).loadCardHelpers = jest.fn().mockResolvedValue({ importMoreInfoControl: importControl });
    const whenDefined = jest.spyOn(customElements, 'whenDefined').mockImplementation(name => name === 'ha-date-input'
      ? new Promise(resolve => { completeDefinition = () => resolve(HTMLElement); }) : Promise.resolve(HTMLElement));
    const loading = card._loadComponents();
    await flush();
    expect(card.render()).toBe(nothing);
    expect(whenDefined).not.toHaveBeenCalled();
    completeImport();
    await flush();
    expect(importControl).toHaveBeenCalledWith('input_datetime');
    expect(whenDefined.mock.calls.slice(0, 4).map(call => call[0])).toEqual([
      'ha-date-input', 'ha-icon-button-prev', 'ha-icon-button-next',
    ]);
    expect(card.render()).toBe(nothing);
    completeDefinition();
    await loading;
    expect(card._componentsReady).toBe(true);
    expect(card.render()).not.toBe(nothing);
  });

  it.each(['helper', 'definitions'])('times out after five seconds when %s hangs', async stage => {
    const { card } = setup();
    (window as any).loadCardHelpers = stage === 'helper' ? () => new Promise(() => {})
      : async () => ({ importMoreInfoControl: async () => {} });
    jest.spyOn(customElements, 'whenDefined').mockImplementation(() => new Promise(() => {}));
    const loading = card._loadComponents();
    await flush();
    jest.advanceTimersByTime(4999);
    expect(card._componentsReady).toBe(false);
    jest.advanceTimersByTime(1);
    await loading;
    expect(card._componentsReady).toBe(true);
  });

  it('swallows helper failures and starts only once across reconnects', async () => {
    const { card } = setup();
    (window as any).loadCardHelpers = jest.fn().mockRejectedValue(new Error('unavailable'));
    document.body.append(card);
    await flush();
    card.remove();
    document.body.append(card);
    await flush();
    card.remove();
    expect((window as any).loadCardHelpers).toHaveBeenCalledTimes(1);
    expect(card._componentsReady).toBe(true);
  });
});

describe('default and billing selection', () => {
  it('applies the default once, even with synchronous collection callbacks', () => {
    const { card, collection } = setup({ default_period: 'week' });
    collection.setPeriod.mockImplementation((start, end) => update(card, start, end));
    update(card, new Date(NaN));
    expect(card._defaultPeriodApplied).toBe(false);
    update(card);
    expect(collection.setPeriod).toHaveBeenCalledTimes(1);
    expect(collection.setPeriod).toHaveBeenCalledWith(today(), new Date(2026, 9, 25, 23, 59, 59, 999));
    update(card);
    expect(collection.setPeriod).toHaveBeenCalledTimes(1);
  });

  it('does not override an existing historical choice on later updates', () => {
    const { card, collection } = setup({ default_period: 'year' });
    update(card, new Date(2026, 8, 1));
    update(card);
    expect(collection.setPeriod).not.toHaveBeenCalled();
  });

  it('does not reapply the default after a subscription reset', () => {
    const { card, collection } = setup({ default_period: 'month' });
    update(card);
    card.hassUnsubscribe();
    update(card);
    expect(collection.setPeriod).toHaveBeenCalledTimes(1);
  });

  it('selects billing, retains it on updates and navigates whole billing months', () => {
    const { card, collection } = setup({ billing_cycle_day: 28, default_period: 'billing' });
    collection.setPeriod.mockImplementation((start, end) => update(card, start, end));
    update(card);
    expect(card._period).toBe('billing');
    expect(card._startDate).toEqual(new Date(2026, 8, 28));
    card._pickNext();
    expect(card._period).toBe('billing');
    expect(card._startDate).toEqual(new Date(2026, 9, 28));
    card._pickPrevious();
    expect(card._startDate).toEqual(new Date(2026, 8, 28));
    card._pickToday();
    expect(card._endDate).toEqual(billingPeriodEnd(new Date(2026, 8, 28)));
    update(card, new Date(2026, 9, 1), new Date(2026, 9, 31, 23, 59, 59, 999));
    expect(card._period).toBe('month');
  });

  it('selects the current billing period from a historical range', () => {
    const { card, collection } = setup({ billing_cycle_day: 5 });
    update(card, new Date(2025, 0, 1));
    card._handleView({ detail: { value: 'billing' } });
    expect(collection.setPeriod).toHaveBeenCalledWith(new Date(2026, 9, 5), billingPeriodEnd(new Date(2026, 9, 5)));
  });

  it('leaves billing when its configured day is removed', () => {
    const { card, collection } = setup({ billing_cycle_day: 28 });
    card._period = 'billing';
    update(card, new Date(2026, 8, 28), billingPeriodEnd(new Date(2026, 8, 28)));
    card._config = { type: 'custom:test' };
    card.updated(new Map([['_config', undefined]]));
    expect(card._period).toBe('month');
    card._pickToday();
    expect(collection.setPeriod).toHaveBeenLastCalledWith(new Date(2026, 9, 1), new Date(2026, 9, 31, 23, 59, 59, 999));
  });

  it('offers billing only when configured and preserves explicit button lists', () => {
    const { card } = setup({ billing_cycle_day: 1 });
    update(card);
    card._componentsReady = true;
    const buttons = () => card._getPeriodButtons();
    expect(buttons().map((b: any) => b.value)).toContain('billing');
    card._config.period_buttons = ['day'];
    expect(buttons().map((b: any) => b.value)).toEqual(['day']);
    card._config = { period_buttons: ['day', 'billing'] };
    expect(buttons().map((b: any) => b.value)).toEqual(['day']);
  });
});

describe('entity sync', () => {
  it('debounces, ignores duplicate updates and sends only the boundary that changed', () => {
    const { card } = setup({ start_date_entity: 'input_datetime.start', end_date_entity: 'input_datetime.end' });
    card.hass.states['input_datetime.end'] = { attributes: { has_time: true } };
    update(card);
    jest.advanceTimersByTime(300);
    update(card);
    jest.advanceTimersByTime(200);
    expect(card.hass.callService.mock.calls).toEqual([
      ['input_datetime', 'set_datetime', { entity_id: 'input_datetime.start', date: '2026-10-19' }],
      ['input_datetime', 'set_datetime', { entity_id: 'input_datetime.end', datetime: '2026-10-19 23:59:59' }],
    ]);
    update(card);
    jest.advanceTimersByTime(500);
    expect(card.hass.callService).toHaveBeenCalledTimes(2);
    update(card, today(), dayEnd(new Date(2026, 9, 20)));
    jest.advanceTimersByTime(300);
    update(card, today(), dayEnd(new Date(2026, 9, 21)));
    jest.advanceTimersByTime(499);
    expect(card.hass.callService).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1);
    expect(card.hass.callService).toHaveBeenCalledTimes(3);
    expect(card.hass.callService.mock.calls[2][2].datetime).toBe('2026-10-21 23:59:59');
  });

  it('syncs the day default without depending on another collection notification', () => {
    const { card } = setup({ default_period: 'day', start_date_entity: 'input_datetime.start' });
    update(card);
    jest.advanceTimersByTime(500);
    expect(card.hass.callService).toHaveBeenCalledTimes(1);
  });

  it('uses the configured first weekday for the default week', () => {
    const { card, collection } = setup({ default_period: 'week' });
    card.hass.locale.first_weekday = 'sunday';
    update(card);
    expect(collection.setPeriod).toHaveBeenCalledWith(new Date(2026, 9, 18), new Date(2026, 9, 24, 23, 59, 59, 999));
  });

  it('syncs the default period without sending the initial day first', () => {
    const { card, collection } = setup({ default_period: 'month', start_date_entity: 'input_datetime.start' });
    collection.setPeriod.mockImplementation((start, end) => update(card, start, end));
    update(card);
    jest.advanceTimersByTime(500);
    expect(card.hass.callService).toHaveBeenCalledTimes(1);
    expect(card.hass.callService.mock.calls[0][2].date).toBe('2026-10-01');
  });

  it('cancels pending writes when unsubscribing', () => {
    const { card } = setup({ start_date_entity: 'input_datetime.start' });
    update(card);
    card.hassUnsubscribe();
    jest.advanceTimersByTime(500);
    expect(card.hass.callService).not.toHaveBeenCalled();
  });

  it('warns on failed service calls without throwing or looping', async () => {
    const { card } = setup({ start_date_entity: 'input_datetime.start' });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    card.hass.callService.mockRejectedValue(new Error('offline'));
    update(card);
    jest.advanceTimersByTime(500);
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
    update(card);
    jest.advanceTimersByTime(1000);
    expect(card.hass.callService).toHaveBeenCalledTimes(1);
  });
});

describe('config validation', () => {
  it.each([0, 29, 1.5, NaN])('rejects invalid billing cycle day %s', billing_cycle_day => {
    expect(() => validatePeriodConfig({ type: 'custom:test', billing_cycle_day })).toThrow('billing_cycle_day');
  });
  it.each(['start_date_entity', 'end_date_entity'])('rejects the wrong domain for %s', field => {
    expect(() => validatePeriodConfig({ type: 'custom:test', [field]: 'sensor.date' })).toThrow(field);
  });
  it('requires billing configuration for a billing default', () => {
    expect(() => validatePeriodConfig({ type: 'custom:test', default_period: 'billing' })).toThrow('requires');
  });
});
