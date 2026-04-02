import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

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
