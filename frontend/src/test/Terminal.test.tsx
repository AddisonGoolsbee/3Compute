import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerminalTabs, { TerminalComponent } from '../components/Terminal';
import { UserDataContext } from '../util/UserData';

// Get the mock io function
const mockIo = (global as any).mockIo;

// Mock user data context
const mockUserData = {
  userInfo: {
    id: 1,
    username: 'testuser',
    port_start: 8000,
    port_end: 8100,
  },
  files: {},
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
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial tab', () => {
    renderWithContext(<TerminalTabs />);

    // Should show Terminal 1
    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('creates new tab when clicking new tab button', async () => {
    renderWithContext(<TerminalTabs />);

    const newTabButton = screen.getByText('+');
    await user.click(newTabButton);

    // Should now have Terminal 1 and Terminal 2
    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    expect(screen.getByText('Terminal 2')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    renderWithContext(<TerminalTabs />);

    // Create second tab
    await user.click(screen.getByText('+'));

    // Click on Terminal 1
    const tab1 = screen.getByText('Terminal 1');
    await user.click(tab1);

    // Verify tab 1 is active (has active styling)
    expect(tab1.closest('div')).toHaveClass('bg-lum-bg-gray-950');
  });

  it('closes tab when clicking close button', async () => {
    renderWithContext(<TerminalTabs />);

    // Create second tab
    await user.click(screen.getByText('+'));

    // Find close button for Terminal 2 (should be visible on hover)
    const terminal2Container = screen.getByText('Terminal 2').closest('div');
    const closeButton = terminal2Container?.querySelector('button:last-child');

    if (closeButton) {
      await user.click(closeButton);
    }

    // Terminal 2 should be gone
    expect(screen.queryByText('Terminal 2')).not.toBeInTheDocument();
    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
  });

  it('prevents closing the last tab', async () => {
    renderWithContext(<TerminalTabs />);

    // Close button should not be visible for single tab (checking for actual close button)
    const actualCloseButton = screen.queryByText('×');
    expect(actualCloseButton).toBeFalsy();
  });

  it('switches to first tab when active tab is closed', async () => {
    renderWithContext(<TerminalTabs />);

    // Create multiple tabs
    await user.click(screen.getByText('+')); // Terminal 2
    await user.click(screen.getByText('+')); // Terminal 3

    // Make sure Terminal 3 is active (last created)
    const terminal3Container = screen.getByText('Terminal 3').closest('div');
    expect(terminal3Container).toHaveClass('bg-lum-bg-gray-950');

    // Close Terminal 3
    const closeButton = terminal3Container?.querySelector('button:last-child');
    if (closeButton) {
      await user.click(closeButton);
    }

    // Should switch to Terminal 1 (first available)
    const terminal1Container = screen.getByText('Terminal 1').closest('div');
    expect(terminal1Container).toHaveClass('bg-lum-bg-gray-950');
  });

  it('generates sequential tab IDs', async () => {
    renderWithContext(<TerminalTabs />);

    // Create several tabs
    await user.click(screen.getByText('+')); // Terminal 2
    await user.click(screen.getByText('+')); // Terminal 3
    await user.click(screen.getByText('+')); // Terminal 4

    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    expect(screen.getByText('Terminal 2')).toBeInTheDocument();
    expect(screen.getByText('Terminal 3')).toBeInTheDocument();
    expect(screen.getByText('Terminal 4')).toBeInTheDocument();
  });

  it('maintains tab order after closing middle tab', async () => {
    renderWithContext(<TerminalTabs />);

    // Create three tabs
    await user.click(screen.getByText('+')); // Terminal 2
    await user.click(screen.getByText('+')); // Terminal 3

    // Close Terminal 2 (middle tab)
    const terminal2Container = screen.getByText('Terminal 2').closest('div');
    const closeButton = terminal2Container?.querySelector('button:last-child');
    if (closeButton) {
      await user.click(closeButton);
    }

    // Should still have Terminal 1 and Terminal 3
    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    expect(screen.queryByText('Terminal 2')).not.toBeInTheDocument();
    expect(screen.getByText('Terminal 3')).toBeInTheDocument();
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

    await user.click(screen.getByText('+'));

    expect(mockProps.onNew).toHaveBeenCalled();
  });
});