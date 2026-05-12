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
