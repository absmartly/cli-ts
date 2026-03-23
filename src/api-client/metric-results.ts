import chalk from 'chalk';
import type { APIClient } from './api-client.js';
import type { ExperimentId } from './types.js';
import { renderCIBar, formatPct, formatConfidenceValue, formatOwnerLabel } from './format-helpers.js';

function colorByEffect(text: string, impact: number, effect?: string): string {
  if (effect === 'negative') {
    return impact < 0 ? chalk.green(text) : impact > 0 ? chalk.red(text) : text;
  }
  if (effect === 'positive') {
    return impact > 0 ? chalk.green(text) : impact < 0 ? chalk.red(text) : text;
  }
  if (effect === 'unknown') return chalk.magenta(text);
  return chalk.gray(text);
}

function colorCIInterval(bar: string, lower: number | null, upper: number | null, effect?: string): string {
  if (!bar || lower === null || upper === null) return bar;
  const crossesZero = Math.sign(lower) !== Math.sign(upper);
  if (crossesZero) {
    return bar;
  }
  const direction = lower > 0;
  let color: (t: string) => string;
  if (!effect || effect === 'unknown') {
    color = chalk.magenta;
  } else {
    const expected = effect === 'positive';
    color = direction === expected ? chalk.green : chalk.red;
  }
  return bar.replace(/[═●]+/g, match => color(match));
}

export interface VariantResult {
  segment?: string;
  variant: number;
  unit_count: number;
  impact: number | null;
  impact_lower: number | null;
  impact_upper: number | null;
  pvalue: number | null;
  mean: number | null;
  count: number | null;
  variance: number | null;
  abs_impact: number | null;
  abs_impact_lower: number | null;
  abs_impact_upper: number | null;
}

export interface MetricResult {
  metric_id: number;
  name: string;
  type: string;
  effect?: string;
  variants: VariantResult[];
}

export function parseMetricData(
  metricId: number,
  data: { columnNames: string[]; rows: unknown[][] },
): VariantResult[] {
  const cols = data.columnNames;
  const variantIdx = cols.indexOf('variant');
  const unitIdx = cols.indexOf('unit_count');
  if (variantIdx < 0 || unitIdx < 0) {
    return [];
  }
  const prefix = `metric_${metricId}`;
  const col = (suffix: string) => cols.indexOf(`${prefix}${suffix}`);
  const impactIdx = col('_impact');
  const ciLIdx = col('_impact_ci_lower');
  const ciUIdx = col('_impact_ci_upper');
  const pvalIdx = col('_pvalue');
  const meanIdx = col('_mean');
  const countIdx = cols.indexOf(prefix);
  const varIdx = col('_var');
  const absImpactIdx = col('_abs_impact');
  const absImpactLIdx = col('_abs_impact_ci_lower');
  const absImpactUIdx = col('_abs_impact_ci_upper');

  const segmentIdx = cols.findIndex(c => c.startsWith('segment_'));

  const num = (row: unknown[], idx: number): number | null =>
    idx >= 0 ? (row[idx] as number | null) : null;

  return data.rows.map(row => ({
    ...(segmentIdx >= 0 && { segment: row[segmentIdx] as string }),
    variant: row[variantIdx] as number,
    unit_count: row[unitIdx] as number,
    impact: num(row, impactIdx),
    impact_lower: num(row, ciLIdx),
    impact_upper: num(row, ciUIdx),
    pvalue: num(row, pvalIdx),
    mean: num(row, meanIdx),
    count: num(row, countIdx),
    variance: num(row, varIdx),
    abs_impact: num(row, absImpactIdx),
    abs_impact_lower: num(row, absImpactLIdx),
    abs_impact_upper: num(row, absImpactUIdx),
  }));
}

function variantLabel(idx: number, variantNames: Map<number, string>): string {
  const name = variantNames.get(idx);
  if (name) return name;
  return `Variant ${String.fromCharCode(65 + idx)}`;
}

export function formatResultRows(r: MetricResult, variantNames: Map<number, string>): Record<string, unknown>[] {
  const control = r.variants.find(v => v.variant === 0);
  const treatments = r.variants.filter(v => v.variant > 0);
  if (treatments.length === 0) {
    return [{ metric: r.name, type: r.type, impact: '', confidence: '', samples: '' }];
  }

  const formatNum = (n: number | null) => n !== null ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '';
  const formatMean = (n: number | null) => n !== null ? n.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '';
  const controlLabel = variantLabel(0, variantNames);

  return treatments.map(treatment => {
    const ci = treatment.impact !== null && treatment.impact_lower !== null && treatment.impact_upper !== null
      ? renderCIBar(treatment.impact_lower, treatment.impact_upper, treatment.impact)
      : '';

    const confidence = treatment.pvalue !== null
      ? formatConfidenceValue(treatment.pvalue)
      : '';

    const tLabel = variantLabel(treatment.variant, variantNames);

    const row: Record<string, unknown> = {
      metric: r.name,
      type: r.type,
      ...(treatment.segment !== undefined && { segment: treatment.segment }),
      variant: tLabel,
      impact: treatment.impact !== null ? (() => {
        const crossesZero = treatment.impact_lower !== null && treatment.impact_upper !== null && Math.sign(treatment.impact_lower) !== Math.sign(treatment.impact_upper);
        const pctText = crossesZero ? formatPct(treatment.impact) : colorByEffect(formatPct(treatment.impact), treatment.impact, r.effect);
        return `${pctText} ${colorCIInterval(ci, treatment.impact_lower, treatment.impact_upper, r.effect)}`;
      })() : '',
      confidence,
      samples: treatment.unit_count.toLocaleString(),
    };

    if (control) {
      row[`${controlLabel} count`] = formatNum(control.count);
      row[`${controlLabel} mean`] = formatMean(control.mean);
    }
    row[`${tLabel} count`] = formatNum(treatment.count);
    row[`${tLabel} mean`] = formatMean(treatment.mean);

    if (treatment.abs_impact !== null) {
      row.abs_impact = formatNum(treatment.abs_impact);
    }

    return row;
  });
}

export function formatResultRow(r: MetricResult, variantNames: Map<number, string>): Record<string, unknown> {
  return formatResultRows(r, variantNames)[0] ?? { metric: r.name, type: r.type, impact: '', confidence: '', samples: '' };
}

export interface MetricInfo {
  id: number;
  name: string;
  type: string;
  effect?: string;
}

export function extractMetricInfos(experiment: Record<string, unknown>): MetricInfo[] {
  const infos: MetricInfo[] = [];
  const primaryMetric = experiment.primary_metric as Record<string, unknown> | undefined;
  const primaryMetricId = experiment.primary_metric_id as number | undefined;
  if (primaryMetricId && primaryMetric) {
    infos.push({ id: primaryMetricId, name: primaryMetric.name as string, type: 'primary', effect: primaryMetric.effect as string });
  }
  const secondaryMetrics = experiment.secondary_metrics as Array<Record<string, unknown>> | undefined;
  if (secondaryMetrics) {
    for (const m of secondaryMetrics) {
      const metric = m.metric as Record<string, unknown> | undefined;
      infos.push({
        id: m.metric_id as number,
        name: (metric?.name as string) || String(m.metric_id),
        type: (m.type as string) || 'secondary',
        effect: metric?.effect as string,
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
  queryBody?: {
    segment_id?: number;
    segment_source?: string;
    filters?: { segments?: string; from?: number; to?: number };
  },
): Promise<MetricResult[]> {
  const dataPromises = metricInfos.map(m => client.getExperimentMetricData(experimentId, m.id, queryBody));
  const allData = await Promise.all(dataPromises);
  const results: MetricResult[] = [];
  for (let i = 0; i < metricInfos.length; i++) {
    const info = metricInfos[i]!;
    const data = allData[i]!;
    const parsed = parseMetricData(info.id, data);
    const result: MetricResult = { metric_id: info.id, name: info.name, type: info.type, variants: parsed };
    if (info.effect) result.effect = info.effect;
    results.push(result);
  }
  return results;
}

export function metricOwners(metric: Record<string, unknown> | undefined): string {
  const owners = metric?.owners as Array<Record<string, unknown>> | undefined;
  if (!owners || owners.length === 0) return '';
  return owners.map(o => formatOwnerLabel(o)).join(', ');
}
