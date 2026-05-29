/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stub component — Plan 07-3 will implement this.
 * Created by Plan 07-1 (Wave 0 scaffold) so test files can import without
 * Vite module-resolution errors. The stub renders nothing.
 */

import React from 'react';
import type { HeaderDetectResult } from '../lib/import/headerDetect';

interface HeaderRowPickerProps {
  rows: string[][];
  detectResult: HeaderDetectResult | null;
  onPick: (rowIndex: number) => void;
  onCancel: () => void;
}

export const HeaderRowPicker: React.FC<HeaderRowPickerProps> = (_props) => {
  throw new Error('Not implemented — Plan 07-3 will implement HeaderRowPicker');
};
