import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface DevelopmentExperimentParams {
  experimentId: ExperimentId;
  note?: string | undefined;
}

export async function developmentExperiment(
  client: APIClient,
  params: DevelopmentExperimentParams
): Promise<CommandResult<{ id: ExperimentId }>> {
  await client.developmentExperiment(params.experimentId, params.note);
  return {
    data: { id: params.experimentId },
  };
}
