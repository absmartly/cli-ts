import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

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
