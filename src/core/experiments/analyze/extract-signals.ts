import type { LeadingVariant, MetricKind, MetricSignal, SignalStatus } from './types.js';

interface Snapshot {
  columnNames?: string[];
  rows?: unknown[][];
}

interface VariantRef {
  variant?: number;
  name?: string;
}

interface MetricRef {
  metric_id?: number;
  type?: string;
  metric?: { id?: number; name?: string; lower_is_better?: boolean };
}

interface Exp {
  primary_metric_id?: number;
  primary_metric?: { id?: number; name?: string; lower_is_better?: boolean };
  secondary_metrics?: MetricRef[];
  variants?: VariantRef[];
  required_alpha?: string | number | null;
  metrics_snapshot?: Snapshot;
}

interface ExtractResult {
  metricSignals: MetricSignal[];
  leadingVariant: LeadingVariant | null;
  participantCount: number | null;
}

const FLAT_PCT = 1; // |percent_change| under 1% counts as flat
const FLAT_PVALUE = 0.5;

export function extractSignals(experiment: Exp): ExtractResult {
  const snap = experiment.metrics_snapshot;
  if (!snap || !Array.isArray(snap.rows) || snap.rows.length === 0) {
    return { metricSignals: [], leadingVariant: null, participantCount: null };
  }
  const cols = snap.columnNames ?? [];
  const idx = (name: string) => cols.indexOf(name);

  const cMetric = idx('metric_id');
  const cVariant = idx('variant');
  const cPct = idx('percent_change');
  const cP = idx('p_value');
  const cLow = idx('confidence_interval_low');
  const cHigh = idx('confidence_interval_high');
  const cUnits = idx('cum_unit_count');

  const alpha = parseAlpha(experiment.required_alpha) ?? 0.1;

  const variantNames = new Map<number, string>();
  for (const v of experiment.variants ?? []) {
    if (typeof v.variant === 'number') variantNames.set(v.variant, v.name ?? `Variant ${v.variant}`);
  }

  const primaryMetricId = experiment.primary_metric_id ?? experiment.primary_metric?.id ?? null;
  const metricKindById = new Map<number, MetricKind>();
  const metricNameById = new Map<number, string>();
  const lowerIsBetter = new Map<number, boolean>();

  if (primaryMetricId !== null) {
    metricKindById.set(primaryMetricId, 'primary');
    metricNameById.set(primaryMetricId, experiment.primary_metric?.name ?? `metric_${primaryMetricId}`);
    if (experiment.primary_metric?.lower_is_better) lowerIsBetter.set(primaryMetricId, true);
  }
  for (const sm of experiment.secondary_metrics ?? []) {
    const mid = sm.metric_id ?? sm.metric?.id;
    if (typeof mid !== 'number') continue;
    const kind: MetricKind =
      sm.type === 'guardrail' ? 'guardrail' :
      sm.type === 'exploratory' ? 'exploratory' : 'secondary';
    if (!metricKindById.has(mid)) metricKindById.set(mid, kind);
    if (!metricNameById.has(mid)) metricNameById.set(mid, sm.metric?.name ?? `metric_${mid}`);
    if (sm.metric?.lower_is_better) lowerIsBetter.set(mid, true);
  }

  const signals: MetricSignal[] = [];
  let bestPrimary: { variantId: number; impact: number; pValue: number | null } | null = null;
  let participantCount: number | null = null;

  for (const row of snap.rows) {
    if (!Array.isArray(row)) continue;
    const metricId = numAt(row, cMetric);
    const variantId = numAt(row, cVariant);
    if (metricId === null || variantId === null) continue;
    if (variantId === 0) {
      // baseline / control row — skip signal emission, but still use for participant count
      const u = numAt(row, cUnits);
      if (primaryMetricId !== null && metricId === primaryMetricId && u !== null) {
        participantCount = participantCount === null ? u : Math.max(participantCount, u);
      }
      continue;
    }

    const percent = numAt(row, cPct);
    const pValue = numAt(row, cP);
    const ciLow = numAt(row, cLow);
    const ciHigh = numAt(row, cHigh);
    const units = numAt(row, cUnits);

    if (primaryMetricId !== null && metricId === primaryMetricId && units !== null) {
      participantCount = participantCount === null ? units : Math.max(participantCount, units);
    }

    const kind = metricKindById.get(metricId) ?? 'secondary';
    const status = classifyStatus(percent, pValue, alpha, lowerIsBetter.get(metricId) ?? false);

    signals.push({
      metric_id: metricId,
      metric_name: metricNameById.get(metricId) ?? `metric_${metricId}`,
      metric_type: kind,
      variant_id: variantId,
      variant_name: variantNames.get(variantId) ?? `Variant ${variantId}`,
      percent_change: percent,
      p_value: pValue,
      ci_low: ciLow,
      ci_high: ciHigh,
      status,
    });

    if (
      primaryMetricId !== null &&
      metricId === primaryMetricId &&
      typeof percent === 'number' &&
      Number.isFinite(percent)
    ) {
      if (bestPrimary === null || percent > bestPrimary.impact) {
        bestPrimary = { variantId, impact: percent, pValue };
      }
    }
  }

  const leadingVariant: LeadingVariant | null = bestPrimary
    ? {
        variant_id: bestPrimary.variantId,
        variant_name: variantNames.get(bestPrimary.variantId) ?? `Variant ${bestPrimary.variantId}`,
        impact_percent: bestPrimary.impact,
        p_value: bestPrimary.pValue,
      }
    : null;

  return { metricSignals: signals, leadingVariant, participantCount };
}

function numAt(row: unknown[], i: number): number | null {
  if (i < 0 || i >= row.length) return null;
  const v = row[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function parseAlpha(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

function classifyStatus(
  percent: number | null,
  pValue: number | null,
  alpha: number,
  lowerIsBetter: boolean
): SignalStatus {
  if (percent === null || pValue === null) return 'inconclusive';
  const significant = pValue < alpha;
  const directionGood = lowerIsBetter ? percent < 0 : percent > 0;
  if (significant && directionGood) return 'improves';
  if (significant && !directionGood) return 'contradicts';
  if (Math.abs(percent) < FLAT_PCT && pValue > FLAT_PVALUE) return 'flat';
  return 'inconclusive';
}
