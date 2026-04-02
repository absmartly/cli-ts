import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId, UserId, TeamId, AssetRoleId } from '../../lib/api/branded-types.js';

// --- List users ---
export interface ListExperimentAccessUsersParams {
  experimentId: ExperimentId;
}

export async function listExperimentAccessUsers(
  client: APIClient,
  params: ListExperimentAccessUsersParams,
): Promise<CommandResult<unknown[]>> {
  const users = await client.listExperimentAccessUsers(params.experimentId);
  return { data: users as unknown[] };
}

// --- Grant user ---
export interface GrantExperimentAccessUserParams {
  experimentId: ExperimentId;
  userId: UserId;
  roleId: AssetRoleId;
}

export async function grantExperimentAccessUser(
  client: APIClient,
  params: GrantExperimentAccessUserParams,
): Promise<CommandResult<{ experimentId: ExperimentId; userId: UserId }>> {
  await client.grantExperimentAccessUser(params.experimentId, params.userId, params.roleId);
  return { data: { experimentId: params.experimentId, userId: params.userId } };
}

// --- Revoke user ---
export interface RevokeExperimentAccessUserParams {
  experimentId: ExperimentId;
  userId: UserId;
  roleId: AssetRoleId;
}

export async function revokeExperimentAccessUser(
  client: APIClient,
  params: RevokeExperimentAccessUserParams,
): Promise<CommandResult<{ experimentId: ExperimentId; userId: UserId }>> {
  await client.revokeExperimentAccessUser(params.experimentId, params.userId, params.roleId);
  return { data: { experimentId: params.experimentId, userId: params.userId } };
}

// --- List teams ---
export interface ListExperimentAccessTeamsParams {
  experimentId: ExperimentId;
}

export async function listExperimentAccessTeams(
  client: APIClient,
  params: ListExperimentAccessTeamsParams,
): Promise<CommandResult<unknown[]>> {
  const teams = await client.listExperimentAccessTeams(params.experimentId);
  return { data: teams as unknown[] };
}

// --- Grant team ---
export interface GrantExperimentAccessTeamParams {
  experimentId: ExperimentId;
  teamId: TeamId;
  roleId: AssetRoleId;
}

export async function grantExperimentAccessTeam(
  client: APIClient,
  params: GrantExperimentAccessTeamParams,
): Promise<CommandResult<{ experimentId: ExperimentId; teamId: TeamId }>> {
  await client.grantExperimentAccessTeam(params.experimentId, params.teamId, params.roleId);
  return { data: { experimentId: params.experimentId, teamId: params.teamId } };
}

// --- Revoke team ---
export interface RevokeExperimentAccessTeamParams {
  experimentId: ExperimentId;
  teamId: TeamId;
  roleId: AssetRoleId;
}

export async function revokeExperimentAccessTeam(
  client: APIClient,
  params: RevokeExperimentAccessTeamParams,
): Promise<CommandResult<{ experimentId: ExperimentId; teamId: TeamId }>> {
  await client.revokeExperimentAccessTeam(params.experimentId, params.teamId, params.roleId);
  return { data: { experimentId: params.experimentId, teamId: params.teamId } };
}
