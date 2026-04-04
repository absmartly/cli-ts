import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

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
  unitTypeIds?: number[] | undefined;
  teamIds?: number[] | undefined;
  ownerIds?: number[] | undefined;
}

interface InsightsFilterBody {
  from: number;
  to: number;
  aggregation: string;
  unit_type_ids?: number[];
  team_ids?: number[];
  owner_ids?: number[];
}

function buildInsightsFilterBody(params: InsightsFilterParams): InsightsFilterBody {
  const body: InsightsFilterBody = {
    from: toEpochSeconds(params.from),
    to: toEpochSeconds(params.to),
    aggregation: params.aggregation,
  };
  if (params.unitTypeIds !== undefined) body.unit_type_ids = params.unitTypeIds;
  if (params.teamIds !== undefined) body.team_ids = params.teamIds;
  if (params.ownerIds !== undefined) body.owner_ids = params.ownerIds;
  return body;
}

export async function getVelocityInsights(
  client: APIClient,
  params: InsightsFilterParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getVelocityInsights(buildInsightsFilterBody(params));
  return { data };
}

export async function getDecisionInsights(
  client: APIClient,
  params: InsightsFilterParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getDecisionInsights(buildInsightsFilterBody(params));
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

function buildInsightsDetailBody(params: InsightsDetailParams): InsightsDetailBody {
  const body: InsightsDetailBody = {
    from: toEpochSeconds(params.from),
    to: toEpochSeconds(params.to),
    aggregation: params.aggregation,
  };
  if (params.teams !== undefined) body.teams = params.teams;
  if (params.applications !== undefined) body.applications = params.applications;
  return body;
}

export async function getVelocityInsightsDetail(
  client: APIClient,
  params: InsightsDetailParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getVelocityInsightsDetail(buildInsightsDetailBody(params));
  return { data };
}

export async function getDecisionInsightsHistory(
  client: APIClient,
  params: InsightsDetailParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getDecisionInsightsHistory(buildInsightsDetailBody(params));
  return { data };
}
