import { findEnergyCollection } from '../src/energy-collection';

const collection = () => ({ setPeriod: jest.fn(), setCompare: jest.fn(), refresh: jest.fn(), subscribe: jest.fn() });
const hassWith = (connection: Record<string, unknown>, panelUrl?: string) => ({ connection, panelUrl } as any);

describe('findEnergyCollection', () => {
  it('prefers explicit collection key', () => {
    const a = collection();
    const b = collection();
    expect(findEnergyCollection(hassWith({ _energy_custom: a, '_energy_lovelace': b }, 'lovelace'), 'energy_custom')).toBe(a);
  });
  it('falls back to the panel url collection', () => {
    const b = collection();
    expect(findEnergyCollection(hassWith({ _energy_lovelace: b, _energy: collection() }, 'lovelace'))).toBe(b);
  });
  it('falls back to the legacy collection', () => {
    const c = collection();
    expect(findEnergyCollection(hassWith({ _energy: c }, 'lovelace'))).toBe(c);
  });
  it('never creates a collection and ignores non collections', () => {
    const conn: Record<string, unknown> = { _energy: {} };
    expect(findEnergyCollection(hassWith(conn))).toBeUndefined();
    expect(Object.keys(conn)).toEqual(['_energy']);
  });
});
