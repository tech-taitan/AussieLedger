import { describe, it, expect } from 'vitest';
import { validateAbn } from '../validation';

describe('validateAbn', () => {
  it('valid ABN: 51 824 753 556 (official ATO test vector)', () => {
    expect(validateAbn('51 824 753 556')).toEqual({ valid: true });
  });

  it('valid ABN without spaces: 51824753556', () => {
    expect(validateAbn('51824753556')).toEqual({ valid: true });
  });

  it('valid ABN with ABN prefix: ABN 51 824 753 556', () => {
    expect(validateAbn('ABN 51 824 753 556')).toEqual({ valid: true });
  });

  it('invalid ABN: 11 111 111 111 (demo placeholder seed)', () => {
    const result = validateAbn('11 111 111 111');
    expect(result.valid).toBe(false);
    expect(typeof result.reason).toBe('string');
  });

  it('invalid ABN: 22 222 222 222 (second demo placeholder seed)', () => {
    expect(validateAbn('22 222 222 222').valid).toBe(false);
  });

  it('invalid ABN: 00 000 000 000', () => {
    expect(validateAbn('00 000 000 000').valid).toBe(false);
  });

  it('invalid ABN: transposed digit 51 824 753 557', () => {
    expect(validateAbn('51 824 753 557').valid).toBe(false);
  });

  it('rejects too-short input', () => {
    expect(validateAbn('1234').valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateAbn('').valid).toBe(false);
  });
});
