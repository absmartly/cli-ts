import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface SearchExperimentsParams {
  query: string;
  limit: number;
}

export async function searchExperiments(
  client: APIClient,
  params: SearchExperimentsParams
): Promise<CommandResult<unknown[]>> {
  const experiments = await client.searchExperiments(params.query, params.limit);
  return {
    data: experiments as unknown[],
  };
}
