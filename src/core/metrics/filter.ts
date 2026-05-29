// Client-side filtering for `metrics list`. Every field referenced here is
// already present in the GET /metrics list response, so no extra API calls are
// needed. Server-side equivalents are tracked as a follow-up to FT-1966.

export interface MetricFilters {
  metricType?: string[] | undefined;
  goal?: string[] | undefined;
  outlierLimiting?: boolean | undefined; // tri-state: undefined = no filter
  outlierMethod?: string[] | undefined;
  hasPropertyFilter?: boolean | undefined; // tri-state
  propertyFilterPath?: string[] | undefined;
  propertyFilterContains?: string | undefined;
  impactDirection?: string[] | undefined;
  cuped?: boolean | undefined; // tri-state
}

export const OUTLIER_METHODS = ['unlimited', 'quantile', 'stdev', 'fixed'] as const;
export const IMPACT_DIRECTIONS = ['positive', 'negative', 'unknown'] as const;

function splitCsv(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  return parts.length > 0 ? parts : undefined;
}

function trimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? undefined : t;
}

export function parseMetricFilters(options: Record<string, unknown>): MetricFilters {
  // Property-filter presence is split across two commander dests because the
  // requested flag names (--has-property-filter / --no-property-filter) do not
  // share a base name. --no-property-filter declared alone defaults
  // `propertyFilter` to true, so we only treat an explicit `=== false` as the
  // "absent" filter and let --has-property-filter own the "present" filter.
  const hasPropertyFilter =
    options.hasPropertyFilter === true
      ? true
      : options.propertyFilter === false
        ? false
        : undefined;

  return {
    metricType: splitCsv(options.metricType),
    goal: splitCsv(options.goal),
    outlierLimiting:
      typeof options.outlierLimiting === 'boolean' ? options.outlierLimiting : undefined,
    outlierMethod: splitCsv(options.outlierMethod),
    hasPropertyFilter,
    propertyFilterPath: splitCsv(options.propertyFilterPath),
    propertyFilterContains: trimmedString(options.propertyFilterContains),
    impactDirection: splitCsv(options.impactDirection),
    cuped: typeof options.cuped === 'boolean' ? options.cuped : undefined,
  };
}

export function hasActiveMetricFilters(f: MetricFilters): boolean {
  return (
    f.metricType !== undefined ||
    f.goal !== undefined ||
    f.outlierLimiting !== undefined ||
    f.outlierMethod !== undefined ||
    f.hasPropertyFilter !== undefined ||
    f.propertyFilterPath !== undefined ||
    f.propertyFilterContains !== undefined ||
    f.impactDirection !== undefined ||
    f.cuped !== undefined
  );
}

export function validateMetricFilters(
  options: Record<string, unknown>,
  filters: MetricFilters
): void {
  if (options.hasPropertyFilter === true && options.propertyFilter === false) {
    throw new Error('Cannot combine --has-property-filter with --no-property-filter.');
  }

  if (filters.outlierMethod) {
    const allowed = OUTLIER_METHODS as readonly string[];
    const bad = filters.outlierMethod.filter((m) => !allowed.includes(m.toLowerCase()));
    if (bad.length > 0) {
      throw new Error(
        `Invalid --outlier-method value(s): ${bad.join(', ')}. Must be one of: ${OUTLIER_METHODS.join(', ')}.`
      );
    }
  }

  if (filters.impactDirection) {
    const allowed = IMPACT_DIRECTIONS as readonly string[];
    const bad = filters.impactDirection.filter((d) => !allowed.includes(d.toLowerCase()));
    if (bad.length > 0) {
      throw new Error(
        `Invalid --impact-direction value(s): ${bad.join(', ')}. Must be one of: ${IMPACT_DIRECTIONS.join(', ')}.`
      );
    }
  }
}

type Metric = Record<string, unknown>;

const lc = (v: unknown): string => String(v ?? '').toLowerCase();

function byType(m: Metric, f: MetricFilters): boolean {
  if (!f.metricType) return true;
  const want = f.metricType.map((t) => t.toLowerCase());
  return want.includes(lc(m.type));
}

function byImpactDirection(m: Metric, f: MetricFilters): boolean {
  if (!f.impactDirection) return true;
  const want = f.impactDirection.map((d) => d.toLowerCase());
  return want.includes(lc(m.effect));
}

function byGoal(m: Metric, f: MetricFilters): boolean {
  if (!f.goal) return true;
  const goal = m.goal as Metric | null | undefined;
  const denomGoal = m.denominator_goal as Metric | null | undefined;
  const ids = [m.goal_id, m.denominator_goal_id]
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v));
  const names = [goal?.name, denomGoal?.name]
    .filter((v): v is string => typeof v === 'string')
    .map((n) => n.toLowerCase());
  return f.goal.some((token) => {
    if (/^\d+$/.test(token)) return ids.includes(token);
    const t = token.toLowerCase();
    return names.some((n) => n.includes(t));
  });
}

function isLimited(method: unknown): boolean {
  const m = lc(method);
  return m !== '' && m !== 'unlimited';
}

function metricHasOutlierLimiting(m: Metric): boolean {
  return isLimited(m.outlier_limit_method) || isLimited(m.denominator_outlier_limit_method);
}

function byOutlierLimiting(m: Metric, f: MetricFilters): boolean {
  if (f.outlierLimiting === undefined) return true;
  return metricHasOutlierLimiting(m) === f.outlierLimiting;
}

function byOutlierMethod(m: Metric, f: MetricFilters): boolean {
  if (!f.outlierMethod) return true;
  const want = f.outlierMethod.map((x) => x.toLowerCase());
  const num = lc(m.outlier_limit_method);
  const den = lc(m.denominator_outlier_limit_method);
  return (num !== '' && want.includes(num)) || (den !== '' && want.includes(den));
}

function nonEmpty(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function metricHasCuped(m: Metric): boolean {
  return nonEmpty(m.vr_lookback_interval) || nonEmpty(m.denominator_vr_lookback_interval);
}

function byCuped(m: Metric, f: MetricFilters): boolean {
  if (f.cuped === undefined) return true;
  return metricHasCuped(m) === f.cuped;
}

function propertyFilterText(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return '';
  }
}

function hasLeafContent(node: unknown): boolean {
  if (node === null || node === undefined) return false;
  if (Array.isArray(node)) return node.some(hasLeafContent);
  if (typeof node === 'object') return Object.values(node).some(hasLeafContent);
  return true; // a primitive leaf (string/number/boolean) = real content
}

function hasMeaningfulPropertyFilter(raw: unknown): boolean {
  const t = propertyFilterText(raw).trim();
  if (t === '' || t === 'null') return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    // Not JSON but a non-empty string — treat the raw value as a present filter.
    return true;
  }
  // Unwrap the {"filter": ...} envelope when present, then check for any leaf.
  const inner =
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'filter' in (parsed as Record<string, unknown>)
      ? (parsed as Record<string, unknown>).filter
      : parsed;
  return hasLeafContent(inner);
}

function metricHasPropertyFilter(m: Metric): boolean {
  return (
    hasMeaningfulPropertyFilter(m.property_filter) ||
    hasMeaningfulPropertyFilter(m.denominator_property_filter)
  );
}

function collectVarPaths(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const child of node) collectVarPaths(child, out);
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'var') {
        if (typeof value === 'string') out.push(value);
        else if (
          value !== null &&
          typeof value === 'object' &&
          typeof (value as Record<string, unknown>).path === 'string'
        ) {
          out.push((value as Record<string, unknown>).path as string);
        }
      }
      collectVarPaths(value, out);
    }
  }
}

function extractPropertyFilterPaths(raw: unknown): string[] {
  const text = propertyFilterText(raw);
  if (text === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const out: string[] = [];
  collectVarPaths(parsed, out);
  return out;
}

function byPropertyFilterPresence(m: Metric, f: MetricFilters): boolean {
  if (f.hasPropertyFilter === undefined) return true;
  return metricHasPropertyFilter(m) === f.hasPropertyFilter;
}

function byPropertyFilterPath(m: Metric, f: MetricFilters): boolean {
  if (!f.propertyFilterPath) return true;
  const paths = [
    ...extractPropertyFilterPaths(m.property_filter),
    ...extractPropertyFilterPaths(m.denominator_property_filter),
  ].map((p) => p.toLowerCase());
  const want = f.propertyFilterPath.map((t) => t.toLowerCase());
  return want.some((t) => paths.some((p) => p.includes(t)));
}

function byPropertyFilterContains(m: Metric, f: MetricFilters): boolean {
  if (!f.propertyFilterContains) return true;
  const hay = (
    propertyFilterText(m.property_filter) +
    ' ' +
    propertyFilterText(m.denominator_property_filter)
  ).toLowerCase();
  return hay.includes(f.propertyFilterContains.toLowerCase());
}

const PREDICATES: Array<(m: Metric, f: MetricFilters) => boolean> = [
  byType,
  byImpactDirection,
  byGoal,
  byOutlierLimiting,
  byOutlierMethod,
  byCuped,
  byPropertyFilterPresence,
  byPropertyFilterPath,
  byPropertyFilterContains,
];

export function filterMetrics(metrics: Metric[], f: MetricFilters): Metric[] {
  return metrics.filter((m) => PREDICATES.every((p) => p(m, f)));
}
