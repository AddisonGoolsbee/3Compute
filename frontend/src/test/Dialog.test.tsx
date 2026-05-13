import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from '../components/a11y/Dialog';

function Harness({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open={true} onClose={onClose} title="Test dialog" description="Some description">
      <input aria-label="field" />
      <button type="button">Action</button>
    </Dialog>
  );
}

describe('Dialog wrapper', () => {
  it('renders with role=dialog and aria-labelledby pointing at the title', () => {
    render(<Harness onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId!)?.textContent).toBe('Test dialog');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('has a focusable input inside', () => {
    render(<Harness onClose={() => {}} />);
    expect(screen.getByLabelText('field')).toBeInTheDocument();
  });

  it('renders an accessible Close button', () => {
    render(<Harness onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
