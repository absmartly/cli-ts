import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface FollowMetricParams {
  id: MetricId;
}

export async function followMetric(
  client: APIClient,
  params: FollowMetricParams
): Promise<CommandResult<void>> {
  await client.followMetric(params.id);
  return { data: undefined };
}

export interface UnfollowMetricParams {
  id: MetricId;
}

export async function unfollowMetric(
  client: APIClient,
  params: UnfollowMetricParams
): Promise<CommandResult<void>> {
  await client.unfollowMetric(params.id);
  return { data: undefined };
}
