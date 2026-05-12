import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventsSummary, rollUpEvents } from './summary.js';

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

describe('rollUpEvents', () => {
  const day = (y: number, m: number, d: number) => Date.UTC(y, m, d);

  it('passes through daily rows unchanged when period=day', () => {
    const events = [
      { date: day(2026, 4, 10), team_id: 1, count: 5, type: 'exposure' as const },
      { date: day(2026, 4, 11), team_id: 1, count: 7, type: 'exposure' as const },
    ];
    expect(rollUpEvents(events, 'day')).toEqual(events);
  });

  it('buckets days into ISO weeks (Monday start) when period=week', () => {
    // 2026-05-04 is a Monday. 2026-05-10 is the following Sunday.
    const events = [
      { date: day(2026, 4, 4), team_id: 1, count: 1, type: 'exposure' as const },
      { date: day(2026, 4, 7), team_id: 1, count: 2, type: 'exposure' as const },
      { date: day(2026, 4, 10), team_id: 1, count: 3, type: 'exposure' as const },
      { date: day(2026, 4, 11), team_id: 1, count: 4, type: 'exposure' as const }, // next week
    ];
    const result = rollUpEvents(events, 'week');
    expect(result).toEqual([
      { date: day(2026, 4, 4), team_id: 1, count: 6, type: 'exposure' },
      { date: day(2026, 4, 11), team_id: 1, count: 4, type: 'exposure' },
    ]);
  });

  it('buckets into calendar months when period=month', () => {
    const events = [
      { date: day(2026, 3, 28), team_id: 1, count: 1, type: 'exposure' as const },
      { date: day(2026, 4, 1), team_id: 1, count: 2, type: 'exposure' as const },
      { date: day(2026, 4, 31), team_id: 1, count: 3, type: 'exposure' as const },
    ];
    const result = rollUpEvents(events, 'month');
    expect(result).toEqual([
      { date: day(2026, 3, 1), team_id: 1, count: 1, type: 'exposure' },
      { date: day(2026, 4, 1), team_id: 1, count: 5, type: 'exposure' },
    ]);
  });

  it('keeps team_id and type separate when bucketing', () => {
    const events = [
      { date: day(2026, 4, 4), team_id: 1, count: 1, type: 'exposure' as const },
      { date: day(2026, 4, 5), team_id: 2, count: 2, type: 'exposure' as const },
      { date: day(2026, 4, 6), team_id: 1, count: 3, type: 'goal' as const },
      { date: day(2026, 4, 7), team_id: 1, count: 4, type: 'exposure' as const },
    ];
    const result = rollUpEvents(events, 'week');
    expect(result).toContainEqual({ date: day(2026, 4, 4), team_id: 1, count: 5, type: 'exposure' });
    expect(result).toContainEqual({ date: day(2026, 4, 4), team_id: 2, count: 2, type: 'exposure' });
    expect(result).toContainEqual({ date: day(2026, 4, 4), team_id: 1, count: 3, type: 'goal' });
    expect(result).toHaveLength(3);
  });

  it('sorts output by date ascending', () => {
    const events = [
      { date: day(2026, 4, 20), team_id: 1, count: 1, type: 'exposure' as const },
      { date: day(2026, 4, 4), team_id: 1, count: 2, type: 'exposure' as const },
    ];
    const result = rollUpEvents(events, 'week');
    expect(result.map((r) => r.date)).toEqual([day(2026, 4, 4), day(2026, 4, 18)]);
  });
});
