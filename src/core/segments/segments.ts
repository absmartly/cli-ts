import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { SegmentId } from '../../lib/api/branded-types.js';
import { summarizeSegmentRow, applyShowExclude, summarizeSegment } from '../../api-client/entity-summary.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

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

export interface CreateSegmentParams {
  name: string;
  attribute: string;
  description?: string | undefined;
}

export async function createSegment(
  client: APIClient,
  params: CreateSegmentParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = {
    name: params.name,
    value_source_attribute: params.attribute,
  };
  if (params.description !== undefined) payload.description = params.description;
  const data = await client.createSegment(payload);
  return { data };
}

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
