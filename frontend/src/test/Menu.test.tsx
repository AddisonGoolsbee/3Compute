import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu, MenuTrigger, MenuContent, MenuItem } from '../components/a11y/Menu';

// jsdom doesn't implement these but Radix needs them
beforeAll(() => {
  if (!(window.HTMLElement.prototype as unknown as { hasPointerCapture?: unknown }).hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
    window.HTMLElement.prototype.releasePointerCapture = () => {};
    window.HTMLElement.prototype.setPointerCapture = () => {};
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
});

function Harness() {
  return (
    <Menu>
      <MenuTrigger>Open menu</MenuTrigger>
      <MenuContent>
        <MenuItem>One</MenuItem>
        <MenuItem>Two</MenuItem>
        <MenuItem>Three</MenuItem>
      </MenuContent>
    </Menu>
  );
}

describe('Menu wrapper', () => {
  it('trigger has aria-expanded that flips on open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByText('Open menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens and renders items with role=menuitem', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open menu'));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByText('Open menu');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
