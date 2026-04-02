import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { summarizeSegmentRow } from '../../api-client/entity-summary.js';

export interface ListSegmentsParams {
  items: number;
  page: number;
}

export async function listSegments(
  client: APIClient,
  params: ListSegmentsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listSegments(params.items, params.page);
  return { data, rows: (data as Array<Record<string, unknown>>).map(summarizeSegmentRow) };
}
