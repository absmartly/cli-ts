import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export type EventType = 'exposure' | 'goal';

export interface SummaryEventRow {
  date: number;
  team_id: number;
  count: number;
  type: EventType;
}

export interface SummaryTeam {
  id: number;
  name: string;
  initials: string;
  color: string;
}

export interface EventsSummaryResponse {
  events: SummaryEventRow[];
  teams: SummaryTeam[];
}

export interface GetEventsSummaryParams {
  from?: number | undefined;
  to?: number | undefined;
}

const MAX_RANGE_MS = 100 * 86_400_000;

export async function getEventsSummary(
  client: Pick<APIClient, 'getEventsSummary'>,
  params: GetEventsSummaryParams
): Promise<CommandResult<EventsSummaryResponse>> {
  if (params.from !== undefined && params.to !== undefined) {
    if (params.from > params.to) {
      throw new Error('`from` must be less than or equal to `to`');
    }
    if (params.to - params.from > MAX_RANGE_MS) {
      throw new Error('Date range too large - maximum is 100 days');
    }
  }

  const body: { from?: number; to?: number } = {};
  if (params.from !== undefined) body.from = params.from;
  if (params.to !== undefined) body.to = params.to;

  const data = (await client.getEventsSummary(body)) as EventsSummaryResponse;
  return { data };
}

export type Period = 'day' | 'week' | 'month';

function bucketStart(date: number, period: Period): number {
  if (period === 'day') {
    return Date.UTC(
      new Date(date).getUTCFullYear(),
      new Date(date).getUTCMonth(),
      new Date(date).getUTCDate()
    );
  }
  if (period === 'month') {
    const d = new Date(date);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }
  // week: ISO week, Monday start
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay(); // 0 = Sun … 6 = Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1 … Sun=6
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday);
}

export function rollUpEvents(events: SummaryEventRow[], period: Period): SummaryEventRow[] {
  if (period === 'day') {
    return [...events].sort((a, b) => a.date - b.date);
  }
  const buckets = new Map<string, SummaryEventRow>();
  for (const ev of events) {
    const bucket = bucketStart(ev.date, period);
    const key = `${bucket}|${ev.team_id}|${ev.type}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += ev.count;
    } else {
      buckets.set(key, { date: bucket, team_id: ev.team_id, count: ev.count, type: ev.type });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.date - b.date);
}

export type EventTypeFilter = 'all' | 'goal' | 'exposure';

export interface AggregatedRow {
  date: number;
  teams: Map<number, { goal: number; exposure: number; total: number }>;
  totalGoal: number;
  totalExposure: number;
  total: number;
}

export function aggregateByTeam(
  events: SummaryEventRow[],
  options: { eventType: EventTypeFilter }
): AggregatedRow[] {
  const byDate = new Map<number, AggregatedRow>();
  for (const ev of events) {
    if (options.eventType !== 'all' && ev.type !== options.eventType) continue;
    let row = byDate.get(ev.date);
    if (!row) {
      row = { date: ev.date, teams: new Map(), totalGoal: 0, totalExposure: 0, total: 0 };
      byDate.set(ev.date, row);
    }
    let team = row.teams.get(ev.team_id);
    if (!team) {
      team = { goal: 0, exposure: 0, total: 0 };
      row.teams.set(ev.team_id, team);
    }
    if (ev.type === 'goal') {
      team.goal += ev.count;
      row.totalGoal += ev.count;
    } else {
      team.exposure += ev.count;
      row.totalExposure += ev.count;
    }
    team.total += ev.count;
    row.total += ev.count;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date - b.date);
}

export function applyCumulative(rows: AggregatedRow[]): AggregatedRow[] {
  let cumGoal = 0;
  let cumExposure = 0;
  let cumTotal = 0;
  const cumByTeam = new Map<number, { goal: number; exposure: number; total: number }>();
  return rows.map((row) => {
    cumGoal += row.totalGoal;
    cumExposure += row.totalExposure;
    cumTotal += row.total;
    const newTeams = new Map<number, { goal: number; exposure: number; total: number }>();
    // Union of team ids seen so far in current row + all previously seen.
    const allTeamIds = new Set<number>([...cumByTeam.keys(), ...row.teams.keys()]);
    for (const id of allTeamIds) {
      const prev = cumByTeam.get(id) ?? { goal: 0, exposure: 0, total: 0 };
      const cur = row.teams.get(id) ?? { goal: 0, exposure: 0, total: 0 };
      const merged = {
        goal: prev.goal + cur.goal,
        exposure: prev.exposure + cur.exposure,
        total: prev.total + cur.total,
      };
      cumByTeam.set(id, merged);
      newTeams.set(id, merged);
    }
    return {
      date: row.date,
      teams: newTeams,
      totalGoal: cumGoal,
      totalExposure: cumExposure,
      total: cumTotal,
    };
  });
}
