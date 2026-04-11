import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { summarizeTeamRow } from '../../api-client/entity-summary.js';

export interface ListTeamsParams {
  items: number;
  page: number;
  includeArchived?: boolean | undefined;
}

export async function listTeams(
  client: APIClient,
  params: ListTeamsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listTeams(!!params.includeArchived, params.items, params.page);
  return { data, rows: (data as Array<Record<string, unknown>>).map(summarizeTeamRow) };
}
