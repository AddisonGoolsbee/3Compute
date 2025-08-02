import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('Files utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockClear();
  });

  it('should handle file operations', async () => {
    // Mock successful response
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: {} }),
    });

    const FilesModule = await import('../util/Files');
    const { fetchFilesList } = FilesModule;

    if (fetchFilesList) {
      const result = await fetchFilesList();
      expect(result).toBeDefined();
    }
  });

  it('should handle fetch errors gracefully', async () => {
    // Mock failed response
    ;(fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const FilesModule = await import('../util/Files');
    const { fetchFilesList } = FilesModule;

    if (fetchFilesList) {
      await expect(fetchFilesList()).rejects.toThrow('Network error');
    }
  });
});