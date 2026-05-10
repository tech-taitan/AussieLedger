import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MigrationError } from '../MigrationError';

describe('MigrationError', () => {
  it('renders the migration-failed heading', () => {
    render(<MigrationError message="boom" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Data Migration Failed/i)).toBeInTheDocument();
  });

  it('renders the raw message inside a <pre>', () => {
    render(<MigrationError message="No migration registered for version 5." />);
    const pre = screen.getByText('No migration registered for version 5.');
    expect(pre.tagName.toLowerCase()).toBe('pre');
  });

  it('exposes no dismissal affordance (no buttons)', () => {
    render(<MigrationError message="x" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
