import type { APIClient } from './api-client.js';
import type { ExperimentId } from './types.js';
import { renderCIBar, formatPct } from './format-helpers.js';

export interface MetricResult {
  metric_id: number;
  name: string;
  type: string;
  variants: Array<{
    variant: number;
    unit_count: number;
    impact: number | null;
    impact_lower: number | null;
    impact_upper: number | null;
    pvalue: number | null;
    mean: number | null;
  }>;
}

export function parseMetricData(
  metricId: number,
  data: { columnNames: string[]; rows: unknown[][] },
): Array<{ variant: number; unit_count: number; impact: number | null; impact_lower: number | null; impact_upper: number | null; pvalue: number | null; mean: number | null }> {
  const cols = data.columnNames;
  const variantIdx = cols.indexOf('variant');
  const unitIdx = cols.indexOf('unit_count');
  const prefix = `metric_${metricId}`;
  const impactIdx = cols.indexOf(`${prefix}_impact`);
  const ciLIdx = cols.indexOf(`${prefix}_impact_ci_lower`);
  const ciUIdx = cols.indexOf(`${prefix}_impact_ci_upper`);
  const pvalIdx = cols.indexOf(`${prefix}_pvalue`);
  const meanIdx = cols.indexOf(`${prefix}_mean`);

  return data.rows.map(row => ({
    variant: row[variantIdx] as number,
    unit_count: row[unitIdx] as number,
    impact: impactIdx >= 0 ? row[impactIdx] as number | null : null,
    impact_lower: ciLIdx >= 0 ? row[ciLIdx] as number | null : null,
    impact_upper: ciUIdx >= 0 ? row[ciUIdx] as number | null : null,
    pvalue: pvalIdx >= 0 ? row[pvalIdx] as number | null : null,
    mean: meanIdx >= 0 ? row[meanIdx] as number | null : null,
  }));
}

export function formatResultRow(r: MetricResult, variantNames: Map<number, string>): Record<string, unknown> {
  const treatment = r.variants.find(v => v.variant > 0);
  if (!treatment || treatment.impact === null) {
    return { metric: r.name, type: r.type, impact: '', confidence: '', samples: '' };
  }

  const ci = treatment.impact_lower !== null && treatment.impact_upper !== null
    ? renderCIBar(treatment.impact_lower, treatment.impact_upper, treatment.impact)
    : '';

  const confidence = treatment.pvalue !== null
    ? (() => {
        const c = Math.min((1 - treatment.pvalue) * 100, 99.99);
        return `${c.toFixed(c >= 99.9 ? 2 : 1)}%`;
      })()
    : '';

  const variantLabel = variantNames.get(treatment.variant) || `v${treatment.variant}`;

  return {
    metric: r.name,
    type: r.type,
    variant: variantLabel,
    impact: `${formatPct(treatment.impact)} ${ci}`,
    confidence,
    samples: treatment.unit_count.toLocaleString(),
  };
}

export interface MetricInfo {
  id: number;
  name: string;
  type: string;
}

export function extractMetricInfos(experiment: Record<string, unknown>): MetricInfo[] {
  const infos: MetricInfo[] = [];
  const primaryMetric = experiment.primary_metric as Record<string, unknown> | undefined;
  const primaryMetricId = experiment.primary_metric_id as number | undefined;
  if (primaryMetricId && primaryMetric) {
    infos.push({ id: primaryMetricId, name: primaryMetric.name as string, type: 'primary' });
  }
  const secondaryMetrics = experiment.secondary_metrics as Array<Record<string, unknown>> | undefined;
  if (secondaryMetrics) {
    for (const m of secondaryMetrics) {
      const metric = m.metric as Record<string, unknown> | undefined;
      infos.push({
        id: m.metric_id as number,
        name: (metric?.name as string) || String(m.metric_id),
        type: (m.type as string) || 'secondary',
      });
    }
  }
  return infos;
}

export function extractVariantNames(experiment: Record<string, unknown>): Map<number, string> {
  const names = new Map<number, string>();
  const variants = experiment.variants as Array<Record<string, unknown>> | undefined;
  if (variants) {
    for (const v of variants) names.set(v.variant as number, (v.name as string) || `v${v.variant}`);
  }
  return names;
}

export async function fetchAllMetricResults(
  client: APIClient,
  experimentId: ExperimentId,
  metricInfos: MetricInfo[],
): Promise<MetricResult[]> {
  const dataPromises = metricInfos.map(m => client.getExperimentMetricData(experimentId, m.id));
  const allData = await Promise.all(dataPromises);
  const results: MetricResult[] = [];
  for (let i = 0; i < metricInfos.length; i++) {
    const info = metricInfos[i]!;
    const data = allData[i]!;
    const parsed = parseMetricData(info.id, data);
    results.push({ metric_id: info.id, name: info.name, type: info.type, variants: parsed });
  }
  return results;
}

export function metricOwners(metric: Record<string, unknown> | undefined): string {
  const owners = metric?.owners as Array<Record<string, unknown>> | undefined;
  if (!owners || owners.length === 0) return '';
  return owners.map(o => {
    const user = o.user as Record<string, unknown> | undefined;
    if (user?.first_name && user?.email) return `${user.first_name} ${user.last_name ?? ''} <${user.email}>`.trim();
    return `user ${o.user_id}`;
  }).join(', ');
}
