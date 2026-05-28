/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiGateNote } from '../AiGateNote';

// Mock isAiEnabled from ai module
vi.mock('../../lib/ai', () => ({
  isAiEnabled: vi.fn(),
  IS_AI_ENABLED: false,
}));

import { isAiEnabled } from '../../lib/ai';

describe('AiGateNote (DEP-01 + FND-04)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('Test A.1: returns null when isAiEnabled() is true', () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    const { container } = render(<AiGateNote />);
    expect(container.firstChild).toBeNull();
  });

  it('Test A.2: when isAiEnabled() is false, shows AI disabled note with Gemini API key mention', () => {
    vi.mocked(isAiEnabled).mockReturnValue(false);
    render(<AiGateNote />);
    const note = screen.getByTestId('ai-gate-note');
    expect(note.textContent).toMatch(/AI suggestions disabled/i);
    expect(note.textContent).toMatch(/Gemini API key/i);
    expect(note.textContent).toMatch(/optional/i);
  });
});
