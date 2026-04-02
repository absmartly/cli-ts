import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const VALID_TASKS = [
  'preview_metrics',
  'preview_summary',
  'preview_group_sequential',
  'preview_report_metrics',
  'preview_participants_history',
  'check_cleanup_needed',
  'check_audience_mismatch',
  'check_sample_size',
  'check_sample_ratio_mismatch',
  'check_interactions',
  'check_assignment_conflict',
  'check_metric_threshold',
] as const;

export interface RequestUpdateParams {
  experimentId: ExperimentId;
  tasks?: string[];
  replaceGsa?: boolean;
}

export function validateTasks(tasks: string[]): void {
  for (const task of tasks) {
    if (!VALID_TASKS.includes(task as any)) {
      throw new Error(`Invalid task: "${task}". Valid tasks: ${VALID_TASKS.join(', ')}`);
    }
  }
}

export async function requestUpdate(
  client: APIClient,
  params: RequestUpdateParams,
): Promise<CommandResult<{ experimentId: ExperimentId }>> {
  if (params.tasks) {
    validateTasks(params.tasks);
  }

  let apiParams: { replaceGroupSequentialAnalysis?: boolean; tasks?: string[] } | undefined;
  if (params.tasks || params.replaceGsa) {
    apiParams = {};
    if (params.tasks) apiParams.tasks = params.tasks;
    if (params.replaceGsa) apiParams.replaceGroupSequentialAnalysis = true;
  }

  await client.requestExperimentUpdate(params.experimentId, apiParams);
  return { data: { experimentId: params.experimentId } };
}
