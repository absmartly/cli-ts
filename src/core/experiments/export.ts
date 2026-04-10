import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export interface ExportExperimentParams {
  experimentId: ExperimentId;
}

export interface ExportExperimentData {
  experimentId: ExperimentId;
  exportConfigId: number;
}

export async function exportExperiment(
  client: APIClient,
  params: ExportExperimentParams
): Promise<CommandResult<ExportExperimentData>> {
  const exportConfig = await client.exportExperimentData(params.experimentId);
  return {
    data: {
      experimentId: params.experimentId,
      exportConfigId: exportConfig.id,
    },
  };
}
