import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function whoami(client: APIClient): Promise<CommandResult<unknown>> {
  const data = await client.getCurrentUser();
  return { data };
}

export interface CreateAuthApiKeyParams {
  name: string;
  description?: string | undefined;
}

export async function createAuthApiKey(
  client: APIClient,
  params: CreateAuthApiKeyParams
): Promise<CommandResult<{ name: string; key: string }>> {
  const data = await client.createUserApiKey(params.name, params.description);
  return { data: data as { name: string; key: string } };
}

export async function listAuthApiKeys(client: APIClient): Promise<CommandResult<unknown[]>> {
  const data = await client.listUserApiKeys();
  return { data };
}

export interface GetAuthApiKeyParams {
  id: number;
}

export async function getAuthApiKey(
  client: APIClient,
  params: GetAuthApiKeyParams
): Promise<CommandResult<unknown>> {
  const data = await client.getUserApiKey(params.id);
  return { data };
}

export interface UpdateAuthApiKeyParams {
  id: number;
  name?: string | undefined;
  description?: string | undefined;
}

export async function updateAuthApiKey(
  client: APIClient,
  params: UpdateAuthApiKeyParams
): Promise<CommandResult<void>> {
  const data: { name?: string; description?: string } = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.description !== undefined) data.description = params.description;
  await client.updateUserApiKey(params.id, data);
  return { data: undefined };
}

export interface DeleteAuthApiKeyParams {
  id: number;
}

export async function deleteAuthApiKey(
  client: APIClient,
  params: DeleteAuthApiKeyParams
): Promise<CommandResult<void>> {
  await client.deleteUserApiKey(params.id);
  return { data: undefined };
}

export interface EditProfileParams {
  firstName?: string | undefined;
  lastName?: string | undefined;
  department?: string | undefined;
  jobTitle?: string | undefined;
}

export async function editProfile(
  client: APIClient,
  params: EditProfileParams
): Promise<
  CommandResult<{
    first_name?: string | undefined;
    last_name?: string | undefined;
    department?: string | undefined;
    job_title?: string | undefined;
  }>
> {
  const data: Record<string, string> = {};
  if (params.firstName !== undefined) data.first_name = params.firstName;
  if (params.lastName !== undefined) data.last_name = params.lastName;
  if (params.department !== undefined) data.department = params.department;
  if (params.jobTitle !== undefined) data.job_title = params.jobTitle;
  const user = await client.updateCurrentUser(data);
  return {
    data: user as {
      first_name?: string | undefined;
      last_name?: string | undefined;
      department?: string | undefined;
      job_title?: string | undefined;
    },
  };
}

export interface ResetMyPasswordParams {
  oldPassword: string;
  newPassword: string;
}

export async function resetMyPassword(
  client: APIClient,
  params: ResetMyPasswordParams
): Promise<CommandResult<void>> {
  await client.updateCurrentUser({
    old_password: params.oldPassword,
    new_password: params.newPassword,
  });
  return { data: undefined };
}
