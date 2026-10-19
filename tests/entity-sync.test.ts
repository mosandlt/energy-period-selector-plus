import { entitySyncPayload, EntitySyncValue } from '../src/entity-sync';

const value = (hasTime = false): EntitySyncValue => ({
  entityId: 'input_datetime.energy_start', timestamp: new Date(2026, 0, 5, 6, 7, 8).getTime(), hasTime,
});

describe('entitySyncPayload', () => {
  it('formats a local calendar date with padding', () => {
    expect(entitySyncPayload(value())).toEqual({ entity_id: value().entityId, date: '2026-01-05' });
  });
  it('formats a local datetime, without UTC conversion or milliseconds', () => {
    expect(entitySyncPayload(value(true))).toEqual({ entity_id: value().entityId, datetime: '2026-01-05 06:07:08' });
  });
  it('does not send unchanged timestamps from different snapshots', () => {
    expect(entitySyncPayload(value(), { ...value() })).toBeUndefined();
  });
  it('sends only changed boundaries', () => {
    const previous = value();
    expect(entitySyncPayload({ ...previous, timestamp: previous.timestamp + 86400000 }, previous)).toBeDefined();
    expect(entitySyncPayload(value(), previous)).toBeUndefined();
  });
  it('sends a new entity or changed date/time capability', () => {
    expect(entitySyncPayload({ ...value(), entityId: 'input_datetime.other' }, value())).toBeDefined();
    expect(entitySyncPayload(value(true), value())).toBeDefined();
  });
});
