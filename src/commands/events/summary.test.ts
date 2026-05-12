import { describe, it, expect } from 'vitest';
import { formatSummaryTable, formatSummaryBars } from './summary.js';
import type { AggregatedRow, SummaryTeam } from '../../core/events/summary.js';

const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

const teams: SummaryTeam[] = [
  { id: 1, name: 'Growth', initials: 'GR', color: 'blue' },
  { id: 2, name: 'Platform', initials: 'PL', color: 'green' },
];

const rows: AggregatedRow[] = [
  {
    date: day(2026, 4, 4),
    teams: new Map([
      [1, { goal: 1, exposure: 10, total: 11 }],
      [2, { goal: 0, exposure: 5, total: 5 }],
    ]),
    totalGoal: 1,
    totalExposure: 15,
    total: 16,
  },
  {
    date: day(2026, 4, 11),
    teams: new Map([[1, { goal: 2, exposure: 8, total: 10 }]]),
    totalGoal: 2,
    totalExposure: 8,
    total: 10,
  },
];

describe('formatSummaryTable', () => {
  it('renders team columns when groupBy=team', () => {
    const out = formatSummaryTable(rows, teams, {
      period: 'week',
      groupBy: 'team',
      eventType: 'all',
      noColor: true,
    });
    expect(out).toMatch(/Growth/);
    expect(out).toMatch(/Platform/);
    expect(out).toMatch(/2026-W19/);
    expect(out).toMatch(/Total/);
  });

  it('renders only total column when groupBy=total', () => {
    const out = formatSummaryTable(rows, teams, {
      period: 'week',
      groupBy: 'total',
      eventType: 'all',
      noColor: true,
    });
    expect(out).not.toMatch(/Growth/);
    expect(out).toMatch(/Total/);
    expect(out).toMatch(/16/);
    expect(out).toMatch(/10/);
  });

  it('formats period as YYYY-MM when period=month', () => {
    const monthRows: AggregatedRow[] = [{ ...rows[0]!, date: day(2026, 4, 1) }];
    const out = formatSummaryTable(monthRows, teams, {
      period: 'month',
      groupBy: 'team',
      eventType: 'all',
      noColor: true,
    });
    expect(out).toMatch(/2026-05/);
    expect(out).not.toMatch(/2026-05-01/);
  });

  it('renders Unowned for team_id=-1', () => {
    const unowned: SummaryTeam = { id: -1, name: 'Unowned', initials: 'UN', color: 'gray' };
    const r: AggregatedRow[] = [
      {
        date: day(2026, 4, 4),
        teams: new Map([[-1, { goal: 0, exposure: 4, total: 4 }]]),
        totalGoal: 0,
        totalExposure: 4,
        total: 4,
      },
    ];
    const out = formatSummaryTable(r, [unowned], {
      period: 'week',
      groupBy: 'team',
      eventType: 'all',
      noColor: true,
    });
    expect(out).toMatch(/Unowned/);
  });

  it('transposes layout when transpose=true: teams are rows, periods are columns', () => {
    const out = formatSummaryTable(rows, teams, {
      period: 'week',
      groupBy: 'team',
      eventType: 'all',
      noColor: true,
      transpose: true,
    });
    // Header row contains 'Team' label and both period columns
    expect(out).toMatch(/Team/);
    expect(out).toMatch(/2026-W19/);
    expect(out).toMatch(/2026-W20/);
    // Team rows: Growth has 11 + 10 = 21 total; Platform has 5 + 0 = 5
    const growthRow = out.split('\n').find((l) => /Growth/.test(l));
    expect(growthRow).toMatch(/21/);
    const platformRow = out.split('\n').find((l) => /Platform/.test(l));
    expect(platformRow).toMatch(/\b5\b/);
    // Bottom totals row sums per period (16, 10) and grand total 26
    const totalRow = out.split('\n').find((l) => /Total/.test(l) && !/Team/.test(l));
    expect(totalRow).toMatch(/16/);
    expect(totalRow).toMatch(/10/);
    expect(totalRow).toMatch(/26/);
  });

  it('transpose is ignored when groupBy=total', () => {
    const normal = formatSummaryTable(rows, teams, {
      period: 'week',
      groupBy: 'total',
      eventType: 'all',
      noColor: true,
    });
    const transposed = formatSummaryTable(rows, teams, {
      period: 'week',
      groupBy: 'total',
      eventType: 'all',
      noColor: true,
      transpose: true,
    });
    expect(transposed).toBe(normal);
  });
});

describe('formatSummaryBars', () => {
  it('renders one line per (period, team) with a bar character', () => {
    const out = formatSummaryBars(rows, teams, {
      period: 'week',
      groupBy: 'team',
      eventType: 'all',
      noColor: true,
    });
    const lines = out.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(3); // 2 teams in week1, 1 in week2
    expect(out).toMatch(/2026-W19/);
    expect(out).toMatch(/Growth/);
    expect(out).toMatch(/Platform/);
    expect(out).toMatch(/█/);
  });

  it('renders one line per period (totals) when groupBy=total', () => {
    const out = formatSummaryBars(rows, teams, {
      period: 'week',
      groupBy: 'total',
      eventType: 'all',
      noColor: true,
    });
    const lines = out.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(2);
  });
});
