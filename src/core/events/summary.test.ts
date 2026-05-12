import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventsSummary } from './summary.js';

describe('getEventsSummary', () => {
  const mockClient = {
    getEventsSummary: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes from/to through to the client', async () => {
    mockClient.getEventsSummary.mockResolvedValue({ events: [], teams: [] });
    const result = await getEventsSummary(mockClient as any, { from: 100, to: 200 });
    expect(mockClient.getEventsSummary).toHaveBeenCalledWith({ from: 100, to: 200 });
    expect(result.data).toEqual({ events: [], teams: [] });
  });

  it('omits undefined from/to', async () => {
    mockClient.getEventsSummary.mockResolvedValue({ events: [], teams: [] });
    await getEventsSummary(mockClient as any, {});
    expect(mockClient.getEventsSummary).toHaveBeenCalledWith({});
  });

  it('rejects ranges greater than 100 days client-side', async () => {
    const from = 0;
    const to = 101 * 86_400_000;
    await expect(
      getEventsSummary(mockClient as any, { from, to })
    ).rejects.toThrow(/maximum is 100 days/i);
    expect(mockClient.getEventsSummary).not.toHaveBeenCalled();
  });

  it('rejects ranges where from > to', async () => {
    await expect(
      getEventsSummary(mockClient as any, { from: 200, to: 100 })
    ).rejects.toThrow(/`from` must be less than or equal to `to`/);
    expect(mockClient.getEventsSummary).not.toHaveBeenCalled();
  });
});
