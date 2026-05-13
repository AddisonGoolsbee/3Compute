import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateClassroomDialog from '../components/CreateClassroomDialog';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ owner: [] }),
      } as Response),
    ),
  );
});

describe('CreateClassroomDialog', () => {
  it('renders as an accessible dialog with title and form input when open', () => {
    render(<CreateClassroomDialog open={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId!)?.textContent).toBe('Create a classroom');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<CreateClassroomDialog open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
