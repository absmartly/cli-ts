import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { SegmentId } from '../../lib/api/branded-types.js';

export interface DeleteSegmentParams {
  id: SegmentId;
}

export async function deleteSegment(
  client: APIClient,
  params: DeleteSegmentParams
): Promise<CommandResult<unknown>> {
  await client.deleteSegment(params.id);
  return { data: { id: params.id } };
}
