import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateTagParams {
  tag: string;
}

export async function createTag(
  client: APIClient,
  params: CreateTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.createExperimentTag({ tag: params.tag });
  return { data };
}
