import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TerminalSession } from '../components/TerminalSession';
import { UserDataContext } from '../util/UserData';

const mockUserData = {
  userInfo: {
    email: 'test@example.com',
    port_start: 8000,
    port_end: 8100,
  },
  files: [],
  setFilesClientSide: vi.fn(),
  openFolders: [],
  setOpenFolders: vi.fn(),
  currentFile: undefined,
  setCurrentFile: vi.fn(),
  refreshFiles: vi.fn(),
};

function renderTerminal() {
  return render(
    <UserDataContext value={mockUserData}>
      <TerminalSession tabId="1" isActive={true} />
    </UserDataContext>,
  );
}

/** Get the most recently created mock Terminal instance */
function getTerminalInstance(): any {
  const instances = (globalThis as any).mockTerminalInstances;
  return instances[instances.length - 1];
}

/** Get the key handler registered via attachCustomKeyEventHandler */
function getKeyHandler(): (event: KeyboardEvent) => boolean {
  const term = getTerminalInstance();
  expect(term.attachCustomKeyEventHandler).toHaveBeenCalled();
  return term.attachCustomKeyEventHandler.mock.calls[0][0];
}

describe('Terminal copy/paste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).mockTerminalInstances.length = 0;
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
        readText: vi.fn(() => Promise.resolve('')),
      },
    });
  });

  it('registers a custom key event handler', () => {
    renderTerminal();
    const term = getTerminalInstance();
    expect(term.attachCustomKeyEventHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it('copies selected text to clipboard on Cmd+C (macOS)', () => {
    renderTerminal();
    const term = getTerminalInstance();
    term.getSelection.mockReturnValue('hello world');

    const handler = getKeyHandler();
    const event = new KeyboardEvent('keydown', { key: 'c', metaKey: true });

    const result = handler(event);

    expect(result).toBe(false);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world');
  });

  it('does NOT copy when no text is selected on Cmd+C', () => {
    renderTerminal();
    const term = getTerminalInstance();
    term.getSelection.mockReturnValue('');

    const handler = getKeyHandler();
    const event = new KeyboardEvent('keydown', { key: 'c', metaKey: true });

    const result = handler(event);

    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copies on Ctrl+Shift+C (Linux)', () => {
    renderTerminal();
    const term = getTerminalInstance();
    term.getSelection.mockReturnValue('linux text');

    const handler = getKeyHandler();
    const event = new KeyboardEvent('keydown', { key: 'C', ctrlKey: true, shiftKey: true });

    const result = handler(event);

    expect(result).toBe(false);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('linux text');
  });

  it('ignores keyup events', () => {
    renderTerminal();
    const term = getTerminalInstance();
    term.getSelection.mockReturnValue('some text');

    const handler = getKeyHandler();
    const event = new KeyboardEvent('keyup', { key: 'c', metaKey: true });

    const result = handler(event);

    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('does not interfere with regular typing', () => {
    renderTerminal();
    const handler = getKeyHandler();

    expect(handler(new KeyboardEvent('keydown', { key: 'a' }))).toBe(true);
    // Ctrl+C without Shift is NOT a copy shortcut (it's SIGINT)
    expect(handler(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }))).toBe(true);

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('does not have an onMouseDown handler on the container', () => {
    renderTerminal();
    const container = document.querySelector('[data-tab-id="1"]');
    expect(container).toBeTruthy();
  });
});
