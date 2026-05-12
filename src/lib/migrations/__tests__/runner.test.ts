import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_VERSION } from '../index';

describe('migrate()', () => {
  it('treats missing _v as version 0 and upgrades to current', () => {
    const result = migrate({});
    expect(result._v).toBe(CURRENT_VERSION);
  });

  it('preserves existing data through the 0 → 1 identity migration', () => {
    const result = migrate({ entities: [{ id: 'x' }] });
    expect(result._v).toBe(CURRENT_VERSION);
    // v3 migration adds Entity defaults (gstRegistered, accountingMethod, fyEndDate, lockedFys).
    // The original `id: 'x'` field is preserved; the additive defaults are appended.
    const ents = result.entities as Array<Record<string, unknown>>;
    expect(ents).toHaveLength(1);
    expect(ents[0].id).toBe('x');
    expect(ents[0].gstRegistered).toBe(false);
    expect(ents[0].accountingMethod).toBe('accruals');
    expect(ents[0].fyEndDate).toBe('06-30');
    expect(ents[0].lockedFys).toEqual([]);
  });

  it('passes through already-current data unchanged', () => {
    const state = { _v: CURRENT_VERSION, entities: [{ id: 'y' }], foo: 'bar' };
    const result = migrate(state as unknown as Record<string, unknown>);
    expect(result._v).toBe(CURRENT_VERSION);
    expect(result.entities).toEqual([{ id: 'y' }]);
    expect((result as unknown as Record<string, unknown>).foo).toBe('bar');
  });

  it('throws for unknown future version (v999)', () => {
    expect(() => migrate({ _v: 999 })).toThrow();
  });

  it('CURRENT_VERSION is 3 after Phase 4', () => {
    expect(CURRENT_VERSION).toBe(3);
  });
});
