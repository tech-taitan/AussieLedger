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
    expect(result.entities).toEqual([{ id: 'x' }]);
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

  it('CURRENT_VERSION is 1 in Phase 1', () => {
    expect(CURRENT_VERSION).toBe(1);
  });
});
