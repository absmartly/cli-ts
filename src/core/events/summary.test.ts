import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventsSummary, rollUpEvents, aggregateByTeam, applyCumulative, type AggregatedRow } from './summary.js';

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
  const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

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

describe('aggregateByTeam', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

  it('groups rows by date and team_id and computes totals', () => {
    const events = [
      { date: day(2026, 4, 4), team_id: 1, count: 10, type: 'exposure' as const },
      { date: day(2026, 4, 4), team_id: 1, count: 3, type: 'goal' as const },
      { date: day(2026, 4, 4), team_id: 2, count: 7, type: 'exposure' as const },
      { date: day(2026, 4, 11), team_id: 1, count: 5, type: 'exposure' as const },
    ];
    const result = aggregateByTeam(events, { eventType: 'all' });
    expect(result).toHaveLength(2);
    const week1 = result[0]!;
    expect(week1.date).toBe(day(2026, 4, 4));
    expect(week1.teams.get(1)).toEqual({ goal: 3, exposure: 10, total: 13 });
    expect(week1.teams.get(2)).toEqual({ goal: 0, exposure: 7, total: 7 });
    expect(week1.totalExposure).toBe(17);
    expect(week1.totalGoal).toBe(3);
    expect(week1.total).toBe(20);
  });

  it('filters to exposures only when eventType=exposure', () => {
    const events = [
      { date: day(2026, 4, 4), team_id: 1, count: 10, type: 'exposure' as const },
      { date: day(2026, 4, 4), team_id: 1, count: 3, type: 'goal' as const },
    ];
    const result = aggregateByTeam(events, { eventType: 'exposure' });
    expect(result[0]!.totalGoal).toBe(0);
    expect(result[0]!.totalExposure).toBe(10);
    expect(result[0]!.total).toBe(10);
    expect(result[0]!.teams.get(1)).toEqual({ goal: 0, exposure: 10, total: 10 });
  });

  it('filters to goals only when eventType=goal', () => {
    const events = [
      { date: day(2026, 4, 4), team_id: 1, count: 10, type: 'exposure' as const },
      { date: day(2026, 4, 4), team_id: 1, count: 3, type: 'goal' as const },
    ];
    const result = aggregateByTeam(events, { eventType: 'goal' });
    expect(result[0]!.totalGoal).toBe(3);
    expect(result[0]!.totalExposure).toBe(0);
    expect(result[0]!.total).toBe(3);
  });

  it('returns empty array for no events', () => {
    expect(aggregateByTeam([], { eventType: 'all' })).toEqual([]);
  });
});

describe('applyCumulative', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

  it('produces running totals over rows', () => {
    const rows: AggregatedRow[] = [
      {
        date: day(2026, 4, 4),
        teams: new Map([[1, { goal: 1, exposure: 10, total: 11 }]]),
        totalGoal: 1,
        totalExposure: 10,
        total: 11,
      },
      {
        date: day(2026, 4, 11),
        teams: new Map([[1, { goal: 2, exposure: 5, total: 7 }]]),
        totalGoal: 2,
        totalExposure: 5,
        total: 7,
      },
    ];
    const out = applyCumulative(rows);
    expect(out[0]!.total).toBe(11);
    expect(out[1]!.total).toBe(18);
    expect(out[0]!.totalExposure).toBe(10);
    expect(out[1]!.totalExposure).toBe(15);
    expect(out[1]!.teams.get(1)).toEqual({ goal: 3, exposure: 15, total: 18 });
  });

  it('carries forward teams that appear later', () => {
    const rows: AggregatedRow[] = [
      {
        date: day(2026, 4, 4),
        teams: new Map([[1, { goal: 0, exposure: 5, total: 5 }]]),
        totalGoal: 0, totalExposure: 5, total: 5,
      },
      {
        date: day(2026, 4, 11),
        teams: new Map([
          [1, { goal: 0, exposure: 3, total: 3 }],
          [2, { goal: 0, exposure: 7, total: 7 }],
        ]),
        totalGoal: 0, totalExposure: 10, total: 10,
      },
    ];
    const out = applyCumulative(rows);
    expect(out[1]!.teams.get(1)).toEqual({ goal: 0, exposure: 8, total: 8 });
    expect(out[1]!.teams.get(2)).toEqual({ goal: 0, exposure: 7, total: 7 });
  });

  it('returns empty array for no rows', () => {
    expect(applyCumulative([])).toEqual([]);
  });
});
