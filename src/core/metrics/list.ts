import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { parseCSV } from '../../api-client/payload/parse-csv.js';

function allNumeric(refs: string[]): boolean {
  return refs.every(r => !isNaN(parseInt(r, 10)) && String(parseInt(r, 10)) === r.trim());
}

export async function resolveOwnerIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveUsers(refs);
  return resolved.map(u => u.id).join(',');
}

export async function resolveTeamIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveTeams(refs);
  return resolved.map(t => t.id).join(',');
}

export interface ListMetricsParams {
  items: number;
  page: number;
  archived?: boolean | undefined;
  include_drafts?: boolean | undefined;
  search?: string | undefined;
  sort?: string | undefined;
  sortAsc?: boolean | undefined;
  ids?: string | undefined;
  owners?: string | undefined;
  teams?: string | undefined;
  reviewStatus?: string | undefined;
}

export async function listMetrics(
  client: APIClient,
  params: ListMetricsParams,
): Promise<CommandResult<unknown[]>> {
  const ownerIds = params.owners ? await resolveOwnerIds(client, params.owners) : undefined;
  const teamIds = params.teams ? await resolveTeamIds(client, params.teams) : undefined;

  const data = await client.listMetrics({
    items: params.items,
    page: params.page,
    archived: params.archived,
    include_drafts: params.include_drafts,
    search: params.search,
    sort: params.sort,
    sort_asc: params.sortAsc,
    ids: params.ids,
    owners: ownerIds,
    teams: teamIds,
    review_status: params.reviewStatus,
  });

  return {
    data,
    pagination: { page: params.page, items: params.items, hasMore: data.length >= params.items },
  };
}
