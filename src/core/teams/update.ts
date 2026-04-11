import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TeamId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateTeamParams {
  id: TeamId;
  description?: string | undefined;
}

export async function updateTeam(
  client: APIClient,
  params: UpdateTeamParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, string> = {};
  if (params.description !== undefined) data.description = params.description;

  requireAtLeastOneField(data, 'update field');
  await client.updateTeam(params.id, data);
  return { data: { id: params.id } };
}
