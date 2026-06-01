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

// Mock isHostedMode from env module
vi.mock('../../lib/env', () => ({
  isHostedMode: vi.fn(),
}));

import { isAiEnabled } from '../../lib/ai';
import { isHostedMode } from '../../lib/env';

describe('AiGateNote (DEP-01 + FND-04)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isHostedMode).mockReturnValue(false);
  });

  it('Test A.1: returns null when isAiEnabled() is true', () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    const { container } = render(<AiGateNote />);
    expect(container.firstChild).toBeNull();
  });

  it('Test A.2: when isAiEnabled() is false and self-host, shows .env.local copy', () => {
    vi.mocked(isAiEnabled).mockReturnValue(false);
    vi.mocked(isHostedMode).mockReturnValue(false);
    render(<AiGateNote />);
    const note = screen.getByTestId('ai-gate-note');
    expect(note.textContent).toMatch(/AI suggestions disabled/i);
    expect(note.textContent).toMatch(/Gemini API key/i);
    expect(note.textContent).toMatch(/optional/i);
    expect(note.textContent).toMatch(/\.env\.local/);
  });

  it('Test A.3: when isAiEnabled() is false and hosted mode, shows hosted-version copy', () => {
    vi.mocked(isAiEnabled).mockReturnValue(false);
    vi.mocked(isHostedMode).mockReturnValue(true);
    render(<AiGateNote />);
    const note = screen.getByTestId('ai-gate-note');
    expect(note.textContent).toMatch(/AI suggestions disabled/i);
    expect(note.textContent).toMatch(/Gemini API key/i);
    expect(note.textContent).toMatch(/optional/i);
    expect(note.textContent).toMatch(/not available on the hosted version/i);
    expect(note.textContent).not.toMatch(/\.env\.local/);
  });
});
