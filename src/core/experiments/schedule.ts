import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId, ScheduledActionId } from '../../lib/api/branded-types.js';

export const VALID_SCHEDULE_ACTIONS = [
  'start',
  'restart',
  'development',
  'stop',
  'archive',
  'full_on',
] as const;

export interface CreateScheduledActionParams {
  experimentId: ExperimentId;
  action: string;
  at: string;
  note?: string;
  reason?: string;
}

export interface CreateScheduledActionResult {
  experimentId: ExperimentId;
  actionId?: number;
  scheduledAt: string;
}

export function validateScheduleParams(params: CreateScheduledActionParams): void {
  if (!(VALID_SCHEDULE_ACTIONS as readonly string[]).includes(params.action)) {
    throw new Error(
      `Invalid action: "${params.action}"\n` + `Valid actions: ${VALID_SCHEDULE_ACTIONS.join(', ')}`
    );
  }

  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(params.at)) {
    throw new Error(
      `Missing timezone in datetime: "${params.at}"\n` +
        `Provide an ISO 8601 timestamp with Z or an offset (e.g., 2026-04-01T10:00:00Z)`
    );
  }

  const date = new Date(params.at);
  if (isNaN(date.getTime())) {
    throw new Error(
      `Invalid datetime: "${params.at}"\n` + `Expected ISO 8601 format (e.g., 2026-04-01T10:00:00Z)`
    );
  }

  if (date.getTime() <= Date.now()) {
    throw new Error(`Scheduled time must be in the future.\n` + `Provided: ${params.at}`);
  }
}

export async function createScheduledAction(
  client: APIClient,
  params: CreateScheduledActionParams
): Promise<CommandResult<CreateScheduledActionResult>> {
  validateScheduleParams(params);

  const date = new Date(params.at);
  const scheduledAction = await client.createScheduledAction(
    params.experimentId,
    params.action,
    date.toISOString(),
    params.note ?? 'Scheduled via CLI',
    params.reason
  );

  return {
    data: {
      experimentId: params.experimentId,
      actionId: scheduledAction.id,
      scheduledAt: date.toISOString(),
    },
  };
}

export interface DeleteScheduledActionParams {
  experimentId: ExperimentId;
  actionId: ScheduledActionId;
}

export async function deleteScheduledAction(
  client: APIClient,
  params: DeleteScheduledActionParams
): Promise<CommandResult<{ experimentId: ExperimentId; actionId: ScheduledActionId }>> {
  await client.deleteScheduledAction(params.experimentId, params.actionId);
  return {
    data: {
      experimentId: params.experimentId,
      actionId: params.actionId,
    },
  };
}
