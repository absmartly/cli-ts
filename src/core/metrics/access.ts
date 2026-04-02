import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId, UserId, TeamId, AssetRoleId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface ListMetricAccessUsersParams {
  id: MetricId;
}

export async function listMetricAccessUsers(
  client: APIClient,
  params: ListMetricAccessUsersParams,
): Promise<CommandResult<unknown>> {
  const data = await client.listMetricAccessUsers(params.id);
  return { data };
}

export interface GrantMetricAccessUserParams {
  id: MetricId;
  userId: UserId;
  roleId: AssetRoleId;
}

export async function grantMetricAccessUser(
  client: APIClient,
  params: GrantMetricAccessUserParams,
): Promise<CommandResult<void>> {
  await client.grantMetricAccessUser(params.id, params.userId, params.roleId);
  return { data: undefined };
}

export interface RevokeMetricAccessUserParams {
  id: MetricId;
  userId: UserId;
  roleId: AssetRoleId;
}

export async function revokeMetricAccessUser(
  client: APIClient,
  params: RevokeMetricAccessUserParams,
): Promise<CommandResult<void>> {
  await client.revokeMetricAccessUser(params.id, params.userId, params.roleId);
  return { data: undefined };
}

export interface ListMetricAccessTeamsParams {
  id: MetricId;
}

export async function listMetricAccessTeams(
  client: APIClient,
  params: ListMetricAccessTeamsParams,
): Promise<CommandResult<unknown>> {
  const data = await client.listMetricAccessTeams(params.id);
  return { data };
}

export interface GrantMetricAccessTeamParams {
  id: MetricId;
  teamId: TeamId;
  roleId: AssetRoleId;
}

export async function grantMetricAccessTeam(
  client: APIClient,
  params: GrantMetricAccessTeamParams,
): Promise<CommandResult<void>> {
  await client.grantMetricAccessTeam(params.id, params.teamId, params.roleId);
  return { data: undefined };
}

export interface RevokeMetricAccessTeamParams {
  id: MetricId;
  teamId: TeamId;
  roleId: AssetRoleId;
}

export async function revokeMetricAccessTeam(
  client: APIClient,
  params: RevokeMetricAccessTeamParams,
): Promise<CommandResult<void>> {
  await client.revokeMetricAccessTeam(params.id, params.teamId, params.roleId);
  return { data: undefined };
}
