import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TeamId, UserId, RoleId } from '../../lib/api/branded-types.js';

export interface ListTeamMembersParams {
  id: TeamId;
}

export async function listTeamMembers(
  client: APIClient,
  params: ListTeamMembersParams
): Promise<CommandResult<unknown>> {
  const data = await client.listTeamMembers(params.id);
  return { data };
}

export interface AddTeamMembersParams {
  id: TeamId;
  userIds: UserId[];
  roleIds?: RoleId[] | undefined;
}

export async function addTeamMembers(
  client: APIClient,
  params: AddTeamMembersParams
): Promise<CommandResult<unknown>> {
  await client.addTeamMembers(params.id, params.userIds, params.roleIds);
  return { data: { teamId: params.id, addedUsers: params.userIds.length } };
}

export interface EditTeamMemberRolesParams {
  id: TeamId;
  userIds: UserId[];
  roleIds: RoleId[];
}

export async function editTeamMemberRoles(
  client: APIClient,
  params: EditTeamMemberRolesParams
): Promise<CommandResult<unknown>> {
  await client.editTeamMemberRoles(params.id, params.userIds, params.roleIds);
  return { data: { teamId: params.id, updatedUsers: params.userIds.length } };
}

export interface RemoveTeamMembersParams {
  id: TeamId;
  userIds: UserId[];
}

export async function removeTeamMembers(
  client: APIClient,
  params: RemoveTeamMembersParams
): Promise<CommandResult<unknown>> {
  await client.removeTeamMembers(params.id, params.userIds);
  return { data: { teamId: params.id, removedUsers: params.userIds.length } };
}
