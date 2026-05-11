-- AussieLedger _v: 2 initial schema
-- Author: Phase 3 (Plan 03-3)
PRAGMA foreign_keys = ON;

CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  registration_number TEXT,
  business_address TEXT,
  contact_person TEXT,
  status TEXT NOT NULL,
  tax_agent_name TEXT,
  tax_agent_phone TEXT,
  tax_agent_email TEXT,
  notes TEXT,
  _v INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  tax_label TEXT,
  company_tax_label TEXT,
  trust_tax_label TEXT,
  partnership_tax_label TEXT,
  gst_code TEXT NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  _v INTEGER NOT NULL DEFAULT 2
);
CREATE UNIQUE INDEX accounts_code_idx ON accounts(code);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  date TEXT NOT NULL,
  reference TEXT NOT NULL,
  description TEXT NOT NULL,
  is_posted INTEGER NOT NULL,
  _v INTEGER NOT NULL DEFAULT 2,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE INDEX journal_entries_entity_idx ON journal_entries(entity_id);
CREATE INDEX journal_entries_date_idx ON journal_entries(date);

CREATE TABLE journal_lines (
  entry_id TEXT NOT NULL,
  line_index INTEGER NOT NULL,
  account_id TEXT NOT NULL,
  description TEXT NOT NULL,
  debit TEXT NOT NULL,
  credit TEXT NOT NULL,
  tax_amount TEXT NOT NULL,
  is_manual_tax INTEGER NOT NULL DEFAULT 0,
  _v INTEGER NOT NULL DEFAULT 2,
  PRIMARY KEY (entry_id, line_index),
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);
-- NOTE: No FK on account_id -> accounts.id. Account codes are mutable (Phase 4).
-- NOTE: debit/credit/tax_amount are TEXT to preserve Decimal precision (src/lib/money.ts).

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL,
  _v INTEGER NOT NULL DEFAULT 2
);
CREATE INDEX audit_logs_timestamp_idx ON audit_logs(timestamp DESC);
