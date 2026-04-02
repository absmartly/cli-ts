import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ApiKeyId } from '../../lib/api/branded-types.js';

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
