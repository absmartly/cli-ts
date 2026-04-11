import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId, RecommendedActionId } from '../../lib/api/branded-types.js';

// --- List recommendations ---
export interface ListRecommendedActionsParams {
  experimentId: ExperimentId;
}

export async function listRecommendedActions(
  client: APIClient,
  params: ListRecommendedActionsParams
): Promise<CommandResult<unknown[]>> {
  const actions = await client.listRecommendedActions(params.experimentId);
  return { data: actions as unknown[] };
}

// --- Dismiss recommendation ---
export interface DismissRecommendedActionParams {
  actionId: RecommendedActionId;
}

export async function dismissRecommendedAction(
  client: APIClient,
  params: DismissRecommendedActionParams
): Promise<CommandResult<{ actionId: RecommendedActionId }>> {
  await client.dismissRecommendedAction(params.actionId);
  return { data: { actionId: params.actionId } };
}
