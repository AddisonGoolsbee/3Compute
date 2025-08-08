import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
(globalThis as any).fetch = vi.fn();

describe('UserData utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    ;(fetch as any).mockClear();
  });

  it('should have correct backend URL', async () => {
    const { backendUrl } = await import('../util/UserData');

    // Should be a valid URL
    expect(typeof backendUrl).toBe('string');
    expect(backendUrl).toMatch(/^https?:\/\//);
  });

  it('should export UserDataContext', async () => {
    const { UserDataContext } = await import('../util/UserData');

    expect(UserDataContext).toBeDefined();
    expect(typeof UserDataContext).toBe('object');
  });
});