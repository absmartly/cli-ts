import type { APIClient } from '../../api-client/api-client.js';
import type { GoalId, UserId, TeamId, AssetRoleId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface ListGoalAccessUsersParams {
  id: GoalId;
}

export async function listGoalAccessUsers(
  client: APIClient,
  params: ListGoalAccessUsersParams,
): Promise<CommandResult<unknown>> {
  const data = await client.listGoalAccessUsers(params.id);
  return { data };
}

export interface GrantGoalAccessUserParams {
  id: GoalId;
  userId: UserId;
  roleId: AssetRoleId;
}

export async function grantGoalAccessUser(
  client: APIClient,
  params: GrantGoalAccessUserParams,
): Promise<CommandResult<void>> {
  await client.grantGoalAccessUser(params.id, params.userId, params.roleId);
  return { data: undefined };
}

export interface RevokeGoalAccessUserParams {
  id: GoalId;
  userId: UserId;
  roleId: AssetRoleId;
}

export async function revokeGoalAccessUser(
  client: APIClient,
  params: RevokeGoalAccessUserParams,
): Promise<CommandResult<void>> {
  await client.revokeGoalAccessUser(params.id, params.userId, params.roleId);
  return { data: undefined };
}

export interface ListGoalAccessTeamsParams {
  id: GoalId;
}

export async function listGoalAccessTeams(
  client: APIClient,
  params: ListGoalAccessTeamsParams,
): Promise<CommandResult<unknown>> {
  const data = await client.listGoalAccessTeams(params.id);
  return { data };
}

export interface GrantGoalAccessTeamParams {
  id: GoalId;
  teamId: TeamId;
  roleId: AssetRoleId;
}

export async function grantGoalAccessTeam(
  client: APIClient,
  params: GrantGoalAccessTeamParams,
): Promise<CommandResult<void>> {
  await client.grantGoalAccessTeam(params.id, params.teamId, params.roleId);
  return { data: undefined };
}

export interface RevokeGoalAccessTeamParams {
  id: GoalId;
  teamId: TeamId;
  roleId: AssetRoleId;
}

export async function revokeGoalAccessTeam(
  client: APIClient,
  params: RevokeGoalAccessTeamParams,
): Promise<CommandResult<void>> {
  await client.revokeGoalAccessTeam(params.id, params.teamId, params.roleId);
  return { data: undefined };
}
