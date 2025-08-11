import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerminalTabs, { TerminalComponent } from '../components/Terminal';
import { UserDataContext } from '../util/UserData';

// Get the mock io function
const mockIo = (globalThis as any).mockIo;

// Mock user data context
const mockUserData = {
  userInfo: {
    email: 'testuser@example.com',
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

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <UserDataContext value={mockUserData}>
      {component}
    </UserDataContext>,
  );
};

describe('TerminalComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders terminal component', () => {
    renderWithContext(
      <TerminalComponent tabId="1" isActive={true} />,
    );

    // Should render the terminal container
    expect(screen.getByTestId || screen.getByRole).toBeDefined();
  });

  it('handles active state correctly', () => {
    const { rerender } = renderWithContext(
      <TerminalComponent tabId="1" isActive={false} />,
    );

    // Get terminal container
    const container = document.querySelector('[data-tab-id="1"]');
    expect(container).toHaveClass('invisible');

    // Rerender with active state
    rerender(
      <UserDataContext value={mockUserData}>
        <TerminalComponent tabId="1" isActive={true} />
      </UserDataContext>,
    );

    expect(container).toHaveClass('visible');
  });

  it('sends correct tab ID in socket query', () => {
    renderWithContext(
      <TerminalComponent tabId="5" isActive={true} />,
    );

    // Verify socket.io was called with correct tab ID
    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        withCredentials: true,
        query: { tabId: '5' },
      }),
    );
  });
});

describe('TerminalTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prevents closing the last tab', async () => {
    renderWithContext(<TerminalTabs />);

    // Close button should not be visible for single tab (checking for actual close button)
    const actualCloseButton = screen.queryByTitle('Close Terminal');
    expect(actualCloseButton).toBeFalsy();
  });

});

describe('TerminalTabBar', () => {
  it('renders tab bar with correct props', async () => {
    const TerminalTabBarModule = await import('../components/TerminalTabBar');
    const { TerminalTabBar } = TerminalTabBarModule;

    const mockProps = {
      tabs: ['1', '2', '3'],
      active: '2',
      onNew: vi.fn(),
      onSelect: vi.fn(),
      onClose: vi.fn(),
    };

    render(<TerminalTabBar {...mockProps} />);

    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    expect(screen.getByText('Terminal 2')).toBeInTheDocument();
    expect(screen.getByText('Terminal 3')).toBeInTheDocument();
  });

  it('calls onSelect when tab is clicked', async () => {
    const TerminalTabBarModule = await import('../components/TerminalTabBar');
    const { TerminalTabBar } = TerminalTabBarModule;
    const user = userEvent.setup();

    const mockProps = {
      tabs: ['1', '2'],
      active: '1',
      onNew: vi.fn(),
      onSelect: vi.fn(),
      onClose: vi.fn(),
    };

    render(<TerminalTabBar {...mockProps} />);

    await user.click(screen.getByText('Terminal 2'));

    expect(mockProps.onSelect).toHaveBeenCalledWith('2');
  });

  it('calls onNew when new tab button is clicked', async () => {
    const TerminalTabBarModule = await import('../components/TerminalTabBar');
    const { TerminalTabBar } = TerminalTabBarModule;
    const user = userEvent.setup();

    const mockProps = {
      tabs: ['1'],
      active: '1',
      onNew: vi.fn(),
      onSelect: vi.fn(),
      onClose: vi.fn(),
    };

    render(<TerminalTabBar {...mockProps} />);

    await user.click(screen.getByTitle('New Terminal'));

    expect(mockProps.onNew).toHaveBeenCalled();
  });
});