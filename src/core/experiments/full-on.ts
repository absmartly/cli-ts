import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface FullOnExperimentParams {
  experimentId: ExperimentId;
  variant: number;
  note?: string | undefined;
}

export async function fullOnExperiment(
  client: APIClient,
  params: FullOnExperimentParams
): Promise<CommandResult<{ id: ExperimentId; variant: number }>> {
  await client.fullOnExperiment(params.experimentId, params.variant, params.note);
  return {
    data: { id: params.experimentId, variant: params.variant },
  };
}
