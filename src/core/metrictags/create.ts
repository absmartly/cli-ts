import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateMetricTagParams {
  tag: string;
}

export async function createMetricTag(
  client: APIClient,
  params: CreateMetricTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.createMetricTag({ tag: params.tag });
  return { data };
}
