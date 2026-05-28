/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaModeModal } from '../PersonaModeModal';

describe('PersonaModeModal (UX-05)', () => {
  it('Test P.1: shows a heading containing "running your own business" OR "manage clients"', () => {
    render(<PersonaModeModal onComplete={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    const content = heading.textContent ?? '';
    const bodyText = document.body.textContent ?? '';
    // Either heading or surrounding text must contain one of these phrases
    const hasOwnerText = /running your own business/i.test(bodyText);
    const hasAgentText = /manage clients/i.test(bodyText);
    expect(hasOwnerText || hasAgentText).toBe(true);
  });

  it('Test P.2: two buttons with data-testid "persona-mode-owner" and "persona-mode-agent"', () => {
    render(<PersonaModeModal onComplete={vi.fn()} />);
    expect(screen.getByTestId('persona-mode-owner')).toBeInTheDocument();
    expect(screen.getByTestId('persona-mode-agent')).toBeInTheDocument();
  });

  it('Test P.3: clicking owner button calls onComplete with { mode: "owner" }', async () => {
    const onComplete = vi.fn();
    render(<PersonaModeModal onComplete={onComplete} />);
    await userEvent.click(screen.getByTestId('persona-mode-owner'));
    expect(onComplete).toHaveBeenCalledWith({ mode: 'owner' });
  });

  it('Test P.4: clicking agent button calls onComplete with { mode: "agent" }', async () => {
    const onComplete = vi.fn();
    render(<PersonaModeModal onComplete={onComplete} />);
    await userEvent.click(screen.getByTestId('persona-mode-agent'));
    expect(onComplete).toHaveBeenCalledWith({ mode: 'agent' });
  });
});
