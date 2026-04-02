import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateMetricParams {
  name: string;
  type: string;
  description: string;
  effect?: string | undefined;
  goalId?: number | undefined;
  owner?: number | undefined;
  formatStr?: string | undefined;
  scale?: number | undefined;
  precision?: number | undefined;
  meanFormatStr?: string | undefined;
  meanScale?: number | undefined;
  meanPrecision?: number | undefined;
  outlierLimitMethod?: string | undefined;
  valueSourceProperty?: string | undefined;
}

export async function createMetric(
  client: APIClient,
  params: CreateMetricParams,
): Promise<CommandResult<{ id: number }>> {
  const payload: Record<string, unknown> = {
    name: params.name,
    type: params.type,
    description: params.description,
    effect: params.effect,
    format_str: params.formatStr,
    scale: params.scale,
    precision: params.precision,
    mean_format_str: params.meanFormatStr,
    mean_scale: params.meanScale,
    mean_precision: params.meanPrecision,
    outlier_limit_method: params.outlierLimitMethod,
  };

  if (params.goalId) payload.goal_id = params.goalId;
  if (params.valueSourceProperty) payload.value_source_property = params.valueSourceProperty;
  if (params.owner) payload.owners = [{ user_id: params.owner }];

  const data = await client.createMetric(payload);
  return { data: data as { id: number } };
}
