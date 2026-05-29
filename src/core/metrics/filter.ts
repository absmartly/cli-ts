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
    outlierLimiting: typeof options.outlierLimiting === 'boolean' ? options.outlierLimiting : undefined,
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
