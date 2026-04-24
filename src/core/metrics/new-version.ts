import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface CreateMetricVersionParams {
  id: MetricId;
  reason?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
  type?: string | undefined;
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

export async function createMetricVersion(
  client: APIClient,
  params: CreateMetricVersionParams
): Promise<CommandResult<{ id: number; version?: number }>> {
  const data: Record<string, unknown> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.description !== undefined) data.description = params.description;
  if (params.type !== undefined) data.type = params.type;
  if (params.effect !== undefined) data.effect = params.effect;
  if (params.goalId !== undefined) data.goal_id = params.goalId;
  if (params.formatStr !== undefined) data.format_str = params.formatStr;
  if (params.scale !== undefined) data.scale = params.scale;
  if (params.precision !== undefined) data.precision = params.precision;
  if (params.meanFormatStr !== undefined) data.mean_format_str = params.meanFormatStr;
  if (params.meanScale !== undefined) data.mean_scale = params.meanScale;
  if (params.meanPrecision !== undefined) data.mean_precision = params.meanPrecision;
  if (params.outlierLimitMethod !== undefined) data.outlier_limit_method = params.outlierLimitMethod;
  if (params.valueSourceProperty !== undefined)
    data.value_source_property = params.valueSourceProperty;
  if (params.owner !== undefined) data.owners = [{ user_id: params.owner }];

  const result = await client.createMetricVersion(params.id, data, params.reason);
  return { data: result as unknown as { id: number; version?: number } };
}
