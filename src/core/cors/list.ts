import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function listCorsOrigins(
  client: APIClient
): Promise<CommandResult<unknown>> {
  const data = await client.listCorsOrigins();
  return { data };
}
