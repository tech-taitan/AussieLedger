/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderRowPicker } from '../HeaderRowPicker';
import type { HeaderDetectResult } from '../../lib/import/headerDetect';

function makeResult(overrides: Partial<HeaderDetectResult> = {}): HeaderDetectResult {
  return {
    topCandidate: {
      rowIndex: 4,
      score: 0.85,
      confidence: 0.7,
      matchedKeywords: ['account', 'code', 'debit', 'credit'],
      stringDensity: 1,
    },
    alternatives: [
      { rowIndex: 5, score: 0.50, confidence: 0, matchedKeywords: [], stringDensity: 0.8 },
      { rowIndex: 0, score: 0.40, confidence: 0, matchedKeywords: [], stringDensity: 1 },
      { rowIndex: 1, score: 0.40, confidence: 0, matchedKeywords: [], stringDensity: 1 },
    ],
    autoPickRow: 4,
    searchedRows: 15,
    ...overrides,
  };
}

const sampleRows: string[][] = [
  ['Acme Pty Ltd', '', '', ''],
  ['Trial Balance', '', '', ''],
  ['FY2026', '', '', ''],
  ['', '', '', ''],
  ['Account', 'Code', 'Debit', 'Credit'],
  ['Sales', '4100', '0', '50000'],
];

describe('HeaderRowPicker (IMP-07 UI)', () => {
  it('renders preview with auto-pick row highlighted (bg-blue-50)', () => {
    render(
      <HeaderRowPicker
        rows={sampleRows}
        detectResult={makeResult()}
        onPick={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const autoRow = screen.getByTestId('header-row-4');
    expect(autoRow.className).toContain('bg-blue-50');
  });

  it('clicking any row in preview fires onPick(rowIndex)', () => {
    const onPick = vi.fn();
    render(
      <HeaderRowPicker
        rows={sampleRows}
        detectResult={makeResult()}
        onPick={onPick}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('header-row-2'));
    expect(onPick).toHaveBeenCalledWith(2);
  });

  it('low-confidence path (autoPickRow: null) shows "Pick the header row" prompt + top-3 candidates with scores', () => {
    render(
      <HeaderRowPicker
        rows={sampleRows}
        detectResult={makeResult({ autoPickRow: null })}
        onPick={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('header-manual-prompt')).toBeTruthy();
    // top-3 alternatives are always rendered in manual mode (auto-opened)
    expect(screen.getByTestId('header-candidate-5')).toBeTruthy();
    expect(screen.getByTestId('header-candidate-0')).toBeTruthy();
  });

  it('high-confidence path shows "We think row N is the header" with confidence percentage badge', () => {
    render(
      <HeaderRowPicker
        rows={sampleRows}
        detectResult={makeResult()}
        onPick={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const banner = screen.getByTestId('header-auto-pick-banner');
    expect(banner.textContent).toMatch(/row 5/); // 1-based
    expect(banner.textContent).toMatch(/70%/); // 0.7 confidence -> 70%
  });

  it('"pick a different row" link reveals top-3 alternatives', () => {
    render(
      <HeaderRowPicker
        rows={sampleRows}
        detectResult={makeResult()}
        onPick={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // Default collapsed in high-confidence path
    expect(screen.queryByTestId('header-candidate-5')).toBeNull();
    fireEvent.click(screen.getByTestId('header-show-alternatives'));
    expect(screen.getByTestId('header-candidate-5')).toBeTruthy();
  });

  it('Cancel link fires onCancel', () => {
    const onCancel = vi.fn();
    render(
      <HeaderRowPicker
        rows={sampleRows}
        detectResult={makeResult()}
        onPick={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('header-row-picker-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows merged-header preview when two consecutive rows both qualify as header-like', () => {
    const multiResult = makeResult({
      topCandidate: {
        rowIndex: 4,
        score: 0.85,
        confidence: 0.7,
        matchedKeywords: ['account'],
        stringDensity: 1,
      },
      alternatives: [
        {
          rowIndex: 5,
          score: 0.50,
          confidence: 0,
          matchedKeywords: ['code', 'name'],
          stringDensity: 1,
        },
      ],
    });
    const multiRows: string[][] = [
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['Account', '', 'Debit', 'Credit'],
      ['Code', 'Name', '', ''],
      ['4100', 'Sales', '0', '50000'],
    ];
    render(
      <HeaderRowPicker
        rows={multiRows}
        detectResult={multiResult}
        onPick={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const preview = screen.getByTestId('header-multi-row-preview');
    expect(preview.textContent).toMatch(/Account \/ Code/);
    expect(preview.textContent).toMatch(/Debit/);
  });
});
