/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stub component — Plan 07-3 will implement this.
 * Created by Plan 07-1 (Wave 0 scaffold) so test files can import without
 * Vite module-resolution errors. The stub renders nothing.
 */

import React from 'react';

export type RejectedRowReason =
  | 'subtotal'
  | 'currency-unparseable'
  | 'no-account-code'
  | 'low-confidence-parse'
  | 'other';

export interface RejectedRow {
  rowIndex: number;
  reason: RejectedRowReason;
  rawCode: string;
  rawName: string;
  rawDebit: string;
  rawCredit: string;
  editedCode?: string;
  editedName?: string;
  editedDebit?: string;
  editedCredit?: string;
  failingCellValue?: string;
  failingColumn?: 'debit' | 'credit' | 'code' | 'name';
}

interface RejectedRowsPanelProps {
  rejectedRows: RejectedRow[];
  onUpdate: (rowIndex: number, patch: Partial<RejectedRow>) => void;
  onReparse: (rowIndex: number) => void;
  onApplyToSimilar: (sourceRowIndex: number) => void;
  onIncludeAllSubtotals: () => void;
}

export const RejectedRowsPanel: React.FC<RejectedRowsPanelProps> = (_props) => {
  throw new Error('Not implemented — Plan 07-3 will implement RejectedRowsPanel');
};
