import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { UserId } from '../../api-client/types.js';

export async function resolveUserId(client: APIClient, userRef: string): Promise<UserId> {
  const asInt = parseInt(userRef, 10);
  if (!isNaN(asInt) && String(asInt) === userRef.trim()) return UserId(asInt);
  const resolved = await client.resolveUsers([userRef]);
  if (!resolved || resolved.length === 0) {
    throw new Error(`User "${userRef}" not found. Provide a valid user ID or email.`);
  }
  return UserId(resolved[0]!.id);
}

export interface ListUserApiKeysParams {
  userRef: string;
  items?: number | undefined;
  page?: number | undefined;
}

export async function listUserApiKeys(
  client: APIClient,
  params: ListUserApiKeysParams
): Promise<CommandResult<unknown[]>> {
  const userId = await resolveUserId(client, params.userRef);
  const data = await client.listUserApiKeysByUserId(userId, params.items, params.page);
  return {
    data,
    pagination: {
      page: params.page ?? 1,
      items: params.items ?? 25,
      hasMore: data.length >= (params.items ?? 25),
    },
  };
}

export interface GetUserApiKeyParams {
  userRef: string;
  keyId: number;
}

export async function getUserApiKey(
  client: APIClient,
  params: GetUserApiKeyParams
): Promise<CommandResult<unknown>> {
  const userId = await resolveUserId(client, params.userRef);
  const data = await client.getUserApiKeyByUserId(userId, params.keyId);
  return { data };
}

export interface CreateUserApiKeyParams {
  userRef: string;
  name: string;
  description?: string | undefined;
}

export async function createUserApiKey(
  client: APIClient,
  params: CreateUserApiKeyParams
): Promise<CommandResult<{ name: string; key: string }>> {
  const userId = await resolveUserId(client, params.userRef);
  const payload: { name: string; description?: string } = { name: params.name };
  if (params.description !== undefined) payload.description = params.description;
  const data = await client.createUserApiKeyByUserId(userId, payload);
  return { data: data as { name: string; key: string } };
}

export interface UpdateUserApiKeyParams {
  userRef: string;
  keyId: number;
  name?: string | undefined;
  description?: string | undefined;
}

export async function updateUserApiKey(
  client: APIClient,
  params: UpdateUserApiKeyParams
): Promise<CommandResult<void>> {
  const userId = await resolveUserId(client, params.userRef);
  const data: Record<string, string> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.description !== undefined) data.description = params.description;

  if (Object.keys(data).length === 0) {
    throw new Error('At least one update field is required');
  }

  await client.updateUserApiKeyByUserId(userId, params.keyId, data);
  return { data: undefined };
}

export interface DeleteUserApiKeyParams {
  userRef: string;
  keyId: number;
}

export async function deleteUserApiKey(
  client: APIClient,
  params: DeleteUserApiKeyParams
): Promise<CommandResult<void>> {
  const userId = await resolveUserId(client, params.userRef);
  await client.deleteUserApiKeyByUserId(userId, params.keyId);
  return { data: undefined };
}
