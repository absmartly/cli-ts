import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ApiKeyId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListApiKeysParams {
  items: number;
  page: number;
}

export async function listApiKeys(
  client: APIClient,
  params: ListApiKeysParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listApiKeys({ items: params.items, page: params.page });
  return { data };
}

export interface GetApiKeyParams {
  id: ApiKeyId;
}

export async function getApiKey(
  client: APIClient,
  params: GetApiKeyParams
): Promise<CommandResult<unknown>> {
  const data = await client.getApiKey(params.id);
  return { data };
}

export interface CreateApiKeyParams {
  name: string;
  description?: string | undefined;
  permissions?: string | undefined;
}

export interface CreateApiKeyResult {
  id: unknown;
  key?: string | undefined;
}

export async function createApiKey(
  client: APIClient,
  params: CreateApiKeyParams
): Promise<CommandResult<CreateApiKeyResult>> {
  const payload: Record<string, unknown> = { name: params.name };
  if (params.description !== undefined) payload.description = params.description;
  if (params.permissions !== undefined) payload.permissions = params.permissions;
  const apiKey = await client.createApiKey(payload);

  const key = (apiKey as Record<string, unknown>).key as string | undefined;
  return {
    data: {
      id: apiKey.id,
      key,
    },
  };
}

export interface UpdateApiKeyParams {
  id: ApiKeyId;
  name?: string | undefined;
  description?: string | undefined;
}

export async function updateApiKey(
  client: APIClient,
  params: UpdateApiKeyParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, string> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.description !== undefined) data.description = params.description;

  requireAtLeastOneField(data, 'update field');
  await client.updateApiKey(params.id, data);
  return { data: { id: params.id } };
}

export interface DeleteApiKeyParams {
  id: ApiKeyId;
}

export async function deleteApiKey(
  client: APIClient,
  params: DeleteApiKeyParams
): Promise<CommandResult<unknown>> {
  await client.deleteApiKey(params.id);
  return { data: { id: params.id } };
}
