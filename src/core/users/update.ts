import type { APIClient } from '../../api-client/api-client.js';
import type { UserId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface UpdateUserParams {
  id: UserId;
  name?: string | undefined;
  role?: string | undefined;
}

export async function updateUser(
  client: APIClient,
  params: UpdateUserParams,
): Promise<CommandResult<void>> {
  const data: Record<string, string> = {};
  if (params.name) {
    const parts = params.name.split(' ');
    data.first_name = parts[0] ?? '';
    data.last_name = parts.slice(1).join(' ');
  }

  if (Object.keys(data).length === 0) {
    throw new Error('At least one update field is required');
  }

  await client.updateUser(params.id, data);
  return { data: undefined };
}
