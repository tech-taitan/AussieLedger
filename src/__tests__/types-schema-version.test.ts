import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Schema versioning (FND-09): every persisted type carries _v', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'types.ts'), 'utf-8');

  it('Entity interface declares _v', () => {
    const block = source.match(/export interface Entity \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('Account interface declares _v', () => {
    const block = source.match(/export interface Account \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('JournalLine interface declares _v', () => {
    const block = source.match(/export interface JournalLine \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('JournalEntry interface declares _v', () => {
    const block = source.match(/export interface JournalEntry \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('AuditLog interface declares _v', () => {
    const block = source.match(/export interface AuditLog \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
});
