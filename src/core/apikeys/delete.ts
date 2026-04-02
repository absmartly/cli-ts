import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ApiKeyId } from '../../lib/api/branded-types.js';

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
