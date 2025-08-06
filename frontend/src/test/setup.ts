import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn();

// Mock socket.io-client
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
};

const mockIo = vi.fn(() => mockSocket);

// Reset the mock before each test
beforeEach(() => {
  mockIo.mockClear();
  mockSocket.emit.mockClear();
  mockSocket.on.mockClear();
  mockSocket.disconnect.mockClear();
});

vi.mock('socket.io-client', () => ({
  io: mockIo,
}))

// Export for test usage
;(globalThis as any).mockSocket = mockSocket
;(globalThis as any).mockIo = mockIo;

// Mock xterm
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(() => ({
    open: vi.fn(),
    write: vi.fn(),
    focus: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    loadAddon: vi.fn(),
    scrollToBottom: vi.fn(),
    refresh: vi.fn(),
    element: {
      clientWidth: 800,
      clientHeight: 600,
    },
    rows: 24,
    cols: 80,
  })),
}));

// Mock xterm addons
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn(() => ({ cols: 80, rows: 24 })),
  })),
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn(),
}));

vi.mock('@xterm/addon-search', () => ({
  SearchAddon: vi.fn(),
}));