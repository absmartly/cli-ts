import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { resolveTeamIds, resolveOwnerIds, resolveUnitTypeIds, resolveApplicationIds } from '../resolve.js';

export function toEpochSeconds(dateStr: string): number {
  const ms = new Date(dateStr).getTime();
  if (isNaN(ms)) {
    throw new Error(`Invalid date: "${dateStr}". Expected a valid date string (e.g. "2026-01-01" or "2026-01-01T00:00:00Z").`);
  }
  return Math.floor(ms / 1000);
}

export interface InsightsFilterParams {
  from: string;
  to: string;
  aggregation: string;
  unitTypes?: string | undefined;
  teams?: string | undefined;
  owners?: string | undefined;
}

interface InsightsFilterBody {
  from: number;
  to: number;
  aggregation: string;
  unit_type_ids?: number[];
  team_ids?: number[];
  owner_ids?: number[];
}

async function buildInsightsFilterBody(client: APIClient, params: InsightsFilterParams): Promise<InsightsFilterBody> {
  const body: InsightsFilterBody = {
    from: toEpochSeconds(params.from),
    to: toEpochSeconds(params.to),
    aggregation: params.aggregation,
  };
  if (params.unitTypes !== undefined) {
    const resolved = await resolveUnitTypeIds(client, params.unitTypes);
    body.unit_type_ids = resolved.split(',').map(Number);
  }
  if (params.teams !== undefined) {
    const resolved = await resolveTeamIds(client, params.teams);
    body.team_ids = resolved.split(',').map(Number);
  }
  if (params.owners !== undefined) {
    const resolved = await resolveOwnerIds(client, params.owners);
    body.owner_ids = resolved.split(',').map(Number);
  }
  return body;
}

export async function getVelocityInsights(
  client: APIClient,
  params: InsightsFilterParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getVelocityInsights(await buildInsightsFilterBody(client, params));
  return { data };
}

export async function getDecisionInsights(
  client: APIClient,
  params: InsightsFilterParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getDecisionInsights(await buildInsightsFilterBody(client, params));
  return { data };
}

export interface InsightsDetailParams {
  from: string;
  to: string;
  aggregation: string;
  teams?: string | undefined;
  applications?: string | undefined;
}

interface InsightsDetailBody {
  from: number;
  to: number;
  aggregation: string;
  teams?: string;
  applications?: string;
}

async function buildInsightsDetailBody(client: APIClient, params: InsightsDetailParams): Promise<InsightsDetailBody> {
  const body: InsightsDetailBody = {
    from: toEpochSeconds(params.from),
    to: toEpochSeconds(params.to),
    aggregation: params.aggregation,
  };
  if (params.teams !== undefined) {
    body.teams = await resolveTeamIds(client, params.teams);
  }
  if (params.applications !== undefined) {
    body.applications = await resolveApplicationIds(client, params.applications);
  }
  return body;
}

export async function getVelocityInsightsDetail(
  client: APIClient,
  params: InsightsDetailParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getVelocityInsightsDetail(await buildInsightsDetailBody(client, params));
  return { data };
}

export async function getDecisionInsightsHistory(
  client: APIClient,
  params: InsightsDetailParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getDecisionInsightsHistory(await buildInsightsDetailBody(client, params));
  return { data };
}
