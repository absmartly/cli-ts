import type { APIClient } from '../../api-client/api-client.js';
import type { UserId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface ResetUserPasswordParams {
  id: UserId;
}

export async function resetUserPassword(
  client: APIClient,
  params: ResetUserPasswordParams
): Promise<CommandResult<{ password: string }>> {
  const result = await client.resetUserPassword(params.id);
  return { data: result as { password: string } };
}
