import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export const VALID_STOP_REASONS = [
  'hypothesis_rejected',
  'hypothesis_iteration',
  'user_feedback',
  'data_issue',
  'implementation_issue',
  'experiment_setup_issue',
  'guardrail_metric_impact',
  'secondary_metric_impact',
  'operational_decision',
  'performance_issue',
  'testing',
  'tracking_issue',
  'code_cleaned_up',
  'other',
] as const;

export type StopReason = (typeof VALID_STOP_REASONS)[number];

export interface StopExperimentParams {
  experimentId: ExperimentId;
  reason: StopReason;
  note?: string | undefined;
}

export async function stopExperiment(
  client: APIClient,
  params: StopExperimentParams
): Promise<CommandResult<{ id: ExperimentId }>> {
  if (!(VALID_STOP_REASONS as readonly string[]).includes(params.reason)) {
    throw new Error(
      `Invalid reason: "${params.reason}"\n` + `Valid reasons: ${VALID_STOP_REASONS.join(', ')}`
    );
  }
  await client.stopExperiment(params.experimentId, params.reason, params.note);
  return {
    data: { id: params.experimentId },
  };
}
