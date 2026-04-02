import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export function toEpochSeconds(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export interface InsightsFilterParams {
  from: string;
  to: string;
  aggregation: string;
  unitTypeIds?: number[] | undefined;
  teamIds?: number[] | undefined;
  ownerIds?: number[] | undefined;
}

function buildInsightsFilterBody(params: InsightsFilterParams): Record<string, unknown> {
  const body: Record<string, unknown> = {
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
  const data = await client.getVelocityInsights(buildInsightsFilterBody(params) as any);
  return { data };
}

export async function getDecisionInsights(
  client: APIClient,
  params: InsightsFilterParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getDecisionInsights(buildInsightsFilterBody(params) as any);
  return { data };
}

export interface InsightsDetailParams {
  from: string;
  to: string;
  aggregation: string;
  teams?: string | undefined;
  applications?: string | undefined;
}

function buildInsightsDetailBody(params: InsightsDetailParams): Record<string, unknown> {
  const body: Record<string, unknown> = {
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
  const data = await client.getVelocityInsightsDetail(buildInsightsDetailBody(params) as any);
  return { data };
}

export async function getDecisionInsightsHistory(
  client: APIClient,
  params: InsightsDetailParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getDecisionInsightsHistory(buildInsightsDetailBody(params) as any);
  return { data };
}
