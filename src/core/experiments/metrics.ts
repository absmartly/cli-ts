import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import {
  extractMetricInfos,
  extractVariantNames,
  fetchAllMetricResults,
  formatResultRows,
  metricOwners,
  parseCachedMetricData,
  type MetricInfo,
} from '../../api-client/metric-results.js';

// --- List metrics ---
export interface ListExperimentMetricsParams {
  experimentId: ExperimentId;
}

export async function listExperimentMetrics(
  client: APIClient,
  params: ListExperimentMetricsParams
): Promise<CommandResult<Record<string, unknown>[]>> {
  const experiment = await client.getExperiment(params.experimentId);
  const exp = experiment as Record<string, unknown>;

  const rows: Array<Record<string, unknown>> = [];

  const primary = exp.primary_metric as Record<string, unknown> | undefined;
  if (primary) {
    rows.push({
      id: exp.primary_metric_id,
      name: primary.name,
      type: 'primary',
      owners: metricOwners(primary),
    });
  }

  const secondary = exp.secondary_metrics as Array<Record<string, unknown>> | undefined;
  if (secondary) {
    for (const m of secondary) {
      const metric = m.metric as Record<string, unknown> | undefined;
      rows.push({
        id: m.metric_id,
        name: metric?.name || m.metric_id,
        type: m.type || 'secondary',
        owners: metricOwners(metric),
      });
    }
  }

  return {
    data: rows,
    rows,
  };
}

// --- Add metrics ---
export interface AddExperimentMetricsParams {
  experimentId: ExperimentId;
  metricIds: MetricId[];
}

export async function addExperimentMetrics(
  client: APIClient,
  params: AddExperimentMetricsParams
): Promise<CommandResult<{ experimentId: ExperimentId }>> {
  await client.addExperimentMetrics(params.experimentId, params.metricIds);
  return { data: { experimentId: params.experimentId } };
}

// --- Single-metric actions (confirm impact, exclude, include, remove impact) ---
export interface ExperimentMetricActionParams {
  experimentId: ExperimentId;
  metricId: MetricId;
}

export type ConfirmMetricImpactParams = ExperimentMetricActionParams;
export type ExcludeExperimentMetricParams = ExperimentMetricActionParams;
export type IncludeExperimentMetricParams = ExperimentMetricActionParams;
export type RemoveMetricImpactParams = ExperimentMetricActionParams;

export async function confirmMetricImpact(
  client: APIClient,
  params: ExperimentMetricActionParams
): Promise<CommandResult<{ experimentId: ExperimentId; metricId: MetricId }>> {
  await client.confirmMetricImpact(params.experimentId, params.metricId);
  return { data: { experimentId: params.experimentId, metricId: params.metricId } };
}

export async function excludeExperimentMetric(
  client: APIClient,
  params: ExperimentMetricActionParams
): Promise<CommandResult<{ experimentId: ExperimentId; metricId: MetricId }>> {
  await client.excludeExperimentMetric(params.experimentId, params.metricId);
  return { data: { experimentId: params.experimentId, metricId: params.metricId } };
}

export async function includeExperimentMetric(
  client: APIClient,
  params: ExperimentMetricActionParams
): Promise<CommandResult<{ experimentId: ExperimentId; metricId: MetricId }>> {
  await client.includeExperimentMetric(params.experimentId, params.metricId);
  return { data: { experimentId: params.experimentId, metricId: params.metricId } };
}

export async function removeMetricImpact(
  client: APIClient,
  params: ExperimentMetricActionParams
): Promise<CommandResult<{ experimentId: ExperimentId; metricId: MetricId }>> {
  await client.removeMetricImpact(params.experimentId, params.metricId);
  return { data: { experimentId: params.experimentId, metricId: params.metricId } };
}

// --- Metric results ---
export interface MetricResultsParams {
  experimentId: ExperimentId;
  metricId?: number | undefined;
  segment?: string[] | undefined;
  filter?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  cached?: boolean | undefined;
  ciBar?: boolean | undefined;
  variantIndex?: boolean | undefined;
  raw?: boolean | undefined;
  outputFormat?: string | undefined;
}

export interface MetricResultsData {
  results: unknown[];
  formattedRows: Record<string, unknown>[];
  cachedMeta?:
    | {
        snapshotData?: Record<string, unknown>;
        pendingUpdateRequest?: unknown;
      }
    | undefined;
}

export async function getMetricResults(
  client: APIClient,
  params: MetricResultsParams
): Promise<CommandResult<MetricResultsData>> {
  const experiment = await client.getExperiment(params.experimentId);
  const exp = experiment as Record<string, unknown>;
  const variantNames = extractVariantNames(exp);

  const metricInfos: MetricInfo[] = params.metricId
    ? [
        await (async () => {
          const metric = await client.getMetric(params.metricId as unknown as MetricId);
          const m = metric as Record<string, unknown>;
          return {
            id: params.metricId as unknown as MetricId,
            name: (m.name as string) ?? String(params.metricId),
            type: 'custom',
            effect: m.effect as string,
          };
        })(),
      ]
    : extractMetricInfos(exp);

  if (metricInfos.length === 0) {
    return { data: { results: [], formattedRows: [] } };
  }

  const formatOpts: { ciBar?: boolean; variantIndex?: boolean } = {};
  if (params.ciBar !== undefined) formatOpts.ciBar = params.ciBar;
  if (params.variantIndex !== undefined) formatOpts.variantIndex = params.variantIndex;

  if (params.cached) {
    const cached = await client.getExperimentMetricsCached(params.experimentId);

    if (params.raw) {
      return {
        data: {
          results: [cached],
          formattedRows: [],
          cachedMeta: {
            snapshotData: cached.snapshot_data as Record<string, unknown>,
            pendingUpdateRequest: cached.pending_update_request,
          },
        },
      };
    }

    const results = parseCachedMetricData(metricInfos, cached);
    const formattedRows = results.flatMap((r) => formatResultRows(r, variantNames, formatOpts));

    return {
      data: {
        results,
        formattedRows,
        cachedMeta: {
          snapshotData: cached.snapshot_data as Record<string, unknown>,
          pendingUpdateRequest: cached.pending_update_request,
        },
      },
    };
  }

  type MetricQueryBody = {
    segment_id?: number;
    segment_source?: string;
    filters?: { segments?: string; from?: number; to?: number };
  };

  const baseFilters: { segments?: string; from?: number; to?: number } = {};
  if (params.filter) baseFilters.segments = params.filter;
  const fromTs = parseDateFlagOrUndefined(params.from);
  const toTs = parseDateFlagOrUndefined(params.to);
  if (fromTs !== undefined) baseFilters.from = fromTs;
  if (toTs !== undefined) baseFilters.to = toTs;

  let segmentIds: number[] = [];
  if (params.segment) {
    const segRefs = params.segment;
    const allSegments = await client.listSegments(200, 1);
    for (const ref of segRefs) {
      const asInt = parseInt(ref, 10);
      if (!isNaN(asInt) && String(asInt) === ref.trim()) {
        segmentIds.push(asInt);
      } else {
        const match = allSegments.find(
          (s) => (s as Record<string, unknown>).name?.toString().toLowerCase() === ref.toLowerCase()
        );
        if (!match) {
          const available = allSegments
            .map((s) => `  ${s.id} ${(s as Record<string, unknown>).name}`)
            .join('\n');
          throw new Error(`Segment "${ref}" not found. Available segments:\n${available}`);
        }
        segmentIds.push(match.id);
      }
    }
  }

  const hasFilters = Object.keys(baseFilters).length > 0;

  if (segmentIds.length <= 1) {
    let body: MetricQueryBody | undefined;
    if (segmentIds.length === 1) {
      body = { segment_id: segmentIds[0]! };
      if (hasFilters) body.filters = baseFilters;
    } else if (hasFilters) {
      body = { filters: baseFilters };
    }

    const results = await fetchAllMetricResults(client, params.experimentId, metricInfos, body);
    const formattedRows = results.flatMap((r) => formatResultRows(r, variantNames, formatOpts));
    return { data: { results, formattedRows } };
  } else {
    const allRows: Record<string, unknown>[] = [];

    for (const segId of segmentIds) {
      const body: MetricQueryBody = { segment_id: segId };
      if (hasFilters) body.filters = baseFilters;
      const results = await fetchAllMetricResults(client, params.experimentId, metricInfos, body);
      const rows = results.flatMap((r) => formatResultRows(r, variantNames, formatOpts));
      allRows.push(...rows);
    }

    return { data: { results: [], formattedRows: allRows } };
  }
}

// --- Metric deps ---
export interface MetricDepsParams {
  metricId: MetricId;
}

export interface MetricDepsData {
  metric: Record<string, unknown>;
  meta: Record<string, unknown>;
  usage: Record<string, Record<string, unknown>>;
}

export async function getMetricDeps(
  client: APIClient,
  params: MetricDepsParams
): Promise<CommandResult<MetricDepsData | null>> {
  const allUsages = await client.listMetricUsages();

  const metric = allUsages.find((m: unknown) => {
    const rec = m as Record<string, unknown>;
    return rec.id === params.metricId;
  }) as Record<string, unknown> | undefined;

  if (!metric) {
    return {
      data: null,
      warnings: [`Metric ${params.metricId} not found in usage data. Verify the metric ID exists.`],
    };
  }

  const meta = (metric.metric_shared_metadata ?? {}) as Record<string, unknown>;
  const usage = (metric.usage ?? {}) as Record<string, Record<string, unknown>>;

  return {
    data: { metric, meta, usage },
    detail: metric,
  };
}
