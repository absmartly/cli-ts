import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

// --- Follow ---
export interface FollowExperimentParams {
  experimentId: ExperimentId;
}

export async function followExperiment(
  client: APIClient,
  params: FollowExperimentParams,
): Promise<CommandResult<{ experimentId: ExperimentId }>> {
  await client.followExperiment(params.experimentId);
  return { data: { experimentId: params.experimentId } };
}

// --- Unfollow ---
export interface UnfollowExperimentParams {
  experimentId: ExperimentId;
}

export async function unfollowExperiment(
  client: APIClient,
  params: UnfollowExperimentParams,
): Promise<CommandResult<{ experimentId: ExperimentId }>> {
  await client.unfollowExperiment(params.experimentId);
  return { data: { experimentId: params.experimentId } };
}
