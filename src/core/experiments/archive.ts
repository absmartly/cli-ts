import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface ArchiveExperimentParams {
  experimentId: ExperimentId;
  unarchive?: boolean | undefined;
  note?: string | undefined;
}

export async function archiveExperiment(
  client: APIClient,
  params: ArchiveExperimentParams,
): Promise<CommandResult<{ id: ExperimentId; action: string }>> {
  await client.archiveExperiment(params.experimentId, params.unarchive, params.note);
  const action = params.unarchive ? 'unarchived' : 'archived';
  return {
    data: { id: params.experimentId, action },
  };
}
