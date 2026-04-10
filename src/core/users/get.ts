import type { APIClient } from '../../api-client/api-client.js';
import type { UserId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface GetUserParams {
  id: UserId;
}

export async function getUser(
  client: APIClient,
  params: GetUserParams
): Promise<CommandResult<unknown>> {
  const data = await client.getUser(params.id);
  return { data };
}
