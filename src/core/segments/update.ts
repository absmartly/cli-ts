import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { SegmentId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateSegmentParams {
  id: SegmentId;
  displayName?: string | undefined;
  description?: string | undefined;
}

export async function updateSegment(
  client: APIClient,
  params: UpdateSegmentParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, string> = {};
  if (params.displayName !== undefined) data.display_name = params.displayName;
  if (params.description !== undefined) data.description = params.description;

  requireAtLeastOneField(data, 'update field');
  await client.updateSegment(params.id, data);
  return { data: { id: params.id } };
}
