import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface StartExperimentParams {
  experimentId: ExperimentId;
  note?: string | undefined;
}

export interface StartExperimentResult {
  id: ExperimentId;
  skipped?: boolean;
  skipReason?: string;
}

export async function startExperiment(
  client: APIClient,
  params: StartExperimentParams
): Promise<CommandResult<StartExperimentResult>> {
  const experiment = await client.getExperiment(params.experimentId);
  if (experiment.state === 'created') {
    return {
      data: { id: params.experimentId, skipped: true, skipReason: 'draft state' },
      warnings: [`Experiment ${params.experimentId} is in draft state, skipping`],
    };
  }
  await client.startExperiment(params.experimentId, params.note);
  return {
    data: { id: params.experimentId },
  };
}
