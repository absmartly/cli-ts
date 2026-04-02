import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId, AlertId } from '../../lib/api/branded-types.js';

// --- List alerts ---
export interface ListExperimentAlertsParams {
  experimentId: ExperimentId;
}

export async function listExperimentAlerts(
  client: APIClient,
  params: ListExperimentAlertsParams,
): Promise<CommandResult<unknown[]>> {
  const alerts = await client.listExperimentAlerts(params.experimentId);
  return { data: alerts as unknown[] };
}

// --- Dismiss alert ---
export interface DismissAlertParams {
  alertId: AlertId;
}

export async function dismissAlert(
  client: APIClient,
  params: DismissAlertParams,
): Promise<CommandResult<{ alertId: AlertId }>> {
  await client.dismissAlert(params.alertId);
  return { data: { alertId: params.alertId } };
}
