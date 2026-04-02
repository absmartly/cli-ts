import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { SegmentId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeSegment } from '../../api-client/entity-summary.js';

export interface GetSegmentParams {
  id: SegmentId;
  show?: string[] | undefined;
  exclude?: string[] | undefined;
  raw?: boolean | undefined;
}

export async function getSegment(
  client: APIClient,
  params: GetSegmentParams
): Promise<CommandResult<unknown>> {
  const segment = await client.getSegment(params.id);
  const show = params.show ?? [];
  const exclude = params.exclude ?? [];

  const data = params.raw
    ? segment
    : applyShowExclude(
        summarizeSegment(segment as Record<string, unknown>),
        segment as Record<string, unknown>,
        show,
        exclude
      );
  return { data };
}
