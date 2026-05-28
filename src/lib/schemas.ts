/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared validation schemas — same module is imported by:
 *   - SPA: `src/storage/local.ts` `importAll()` validates inbound state before write
 *   - Server: `server/lib/schema.ts` re-exports these for `POST /api/import` validation
 *
 * Pure zod. No React. No DOM globals. Safe to import from node-env tests.
 */
import { z } from 'zod';

const ShareTypeRecord = z.object({
  interest: z.number().optional(),
  dividend: z.number().optional(),
  capitalGain: z.number().optional(),
  foreign: z.number().optional(),
  other: z.number().optional(),
}).partial();

export const BeneficiaryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  sharePercent: z.number(),
  sharePerType: ShareTypeRecord.optional(),
});

export const PartnerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  sharePercent: z.number(),
  sharePerType: ShareTypeRecord.optional(),
});

export const EntitySchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  name: z.string(),
  type: z.string(),
  registrationNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  contactPerson: z.string().optional(),
  status: z.enum(['Active', 'Archived', 'Deactivated']),
  taxAgentName: z.string().optional(),
  taxAgentPhone: z.string().optional(),
  taxAgentEmail: z.string().optional(),
  notes: z.string().optional(),
  // v3 additions
  gstRegistered: z.boolean().optional(),
  accountingMethod: z.enum(['cash', 'accruals']).optional(),
  fyEndDate: z.string().optional(),
  lockedFys: z.array(z.string()).optional(),
  beneficiaries: z.array(BeneficiaryRowSchema).optional(),
  partners: z.array(PartnerRowSchema).optional(),
  // v4 additions
  aggregatedTurnover: z.string().optional(),
  paygInstalmentAmount: z.string().optional(),
  // v5 additions (Phase 6)
  returnStatusByFy: z.record(z.string(), z.enum(['draft', 'finalised'])).optional(),
  wizardState: z.record(z.string(), z.object({
    _v: z.number().optional(),
    step: z.number(),
    dismissedAnomalies: z.array(z.string()),
    completedAt: z.string().optional(),
  })).optional(),
});

export const AccountSchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  taxLabel: z.string().optional(),
  companyTaxLabel: z.string().optional(),
  trustTaxLabel: z.string().optional(),
  partnershipTaxLabel: z.string().optional(),
  gstCode: z.enum(['GST', 'FRE', 'INP', 'N-T', 'CAP']),
  _needsReview: z.boolean().optional(),
  // v3 additions
  parentCode: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const JournalLineSchema = z.object({
  _v: z.number().optional(),
  accountId: z.string(),
  description: z.string(),
  debit: z.number(),
  credit: z.number(),
  taxAmount: z.number(),
  isManualTax: z.boolean().optional(),
});

export const JournalEntryStatusEnum = z.enum(['draft', 'posted', 'superseded', 'reversed', 'voided']);

export const JournalEntrySchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  date: z.string(),
  reference: z.string(),
  description: z.string(),
  lines: z.array(JournalLineSchema),
  isPosted: z.boolean(),
  // v3 additions
  status: JournalEntryStatusEnum.optional(),
  reversesEntryId: z.string().optional(),
  replacesEntryId: z.string().optional(),
  replacedByEntryId: z.string().optional(),
  importFingerprint: z.string().optional(),
});

export const AuditActionEnum = z.enum([
  'CREATE_ENTITY', 'UPDATE_ENTITY', 'DELETE_ENTITY',
  'POST_JOURNAL', 'EDIT_JOURNAL', 'REVERSE_JOURNAL', 'VOID_JOURNAL', 'DELETE_JOURNAL',
  'CREATE_ACCOUNT', 'UPDATE_ACCOUNT', 'ARCHIVE_ACCOUNT', 'DELETE_ACCOUNT',
  'IMPORT_TB', 'IMPORT_DATA', 'EXPORT_DATA',
  'LOCK_FY', 'UNLOCK_FY',
]);

export const AuditLogSchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  timestamp: z.string(),
  user: z.string(),
  action: AuditActionEnum,
  entityId: z.string().optional(),
  details: z.string(),
});

export const PersistedRootSchema = z.object({
  _v: z.number(),
  entities: z.array(EntitySchema),
  accounts: z.array(AccountSchema),
  allEntries: z.record(z.string(), z.array(JournalEntrySchema)),
  auditLogs: z.array(AuditLogSchema),
});

export type ValidatedEntity = z.infer<typeof EntitySchema>;
export type ValidatedAccount = z.infer<typeof AccountSchema>;
export type ValidatedJournalEntry = z.infer<typeof JournalEntrySchema>;
export type ValidatedAuditLog = z.infer<typeof AuditLogSchema>;
export type ValidatedPersistedRoot = z.infer<typeof PersistedRootSchema>;
