import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CorsOriginId } from '../../lib/api/branded-types.js';

export interface DeleteCorsOriginParams {
  id: CorsOriginId;
}

export async function deleteCorsOrigin(
  client: APIClient,
  params: DeleteCorsOriginParams
): Promise<CommandResult<unknown>> {
  await client.deleteCorsOrigin(params.id);
  return { data: { id: params.id } };
}
