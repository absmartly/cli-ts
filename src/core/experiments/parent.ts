import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export interface GetParentExperimentParams {
  experimentId: ExperimentId;
}

export async function getParentExperiment(
  client: APIClient,
  params: GetParentExperimentParams,
): Promise<CommandResult<unknown>> {
  const experiment = await client.getParentExperiment(params.experimentId);
  return { data: experiment };
}
