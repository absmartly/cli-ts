import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CorsOriginId } from '../../lib/api/branded-types.js';

export interface UpdateCorsOriginParams {
  id: CorsOriginId;
  origin: string;
}

export async function updateCorsOrigin(
  client: APIClient,
  params: UpdateCorsOriginParams
): Promise<CommandResult<unknown>> {
  const data = await client.updateCorsOrigin(params.id, { origin: params.origin });
  return { data };
}
