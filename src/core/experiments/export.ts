import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export interface ExportExperimentParams {
  experimentId: ExperimentId;
}

export async function exportExperiment(
  client: APIClient,
  params: ExportExperimentParams,
): Promise<CommandResult<{ id: ExperimentId }>> {
  await client.exportExperimentData(params.experimentId);
  return {
    data: { id: params.experimentId },
  };
}
