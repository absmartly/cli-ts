import type { APIClient } from '../../api-client/api-client.js';
import type { ListOptions } from '../../api-client/types.js';
import { MetricId } from '../../lib/api/branded-types.js';

export type MetricRole = 'primary' | 'secondary' | 'guardrail' | 'exploratory';

export const ALL_METRIC_ROLES: MetricRole[] = ['primary', 'secondary', 'guardrail', 'exploratory'];

/** Page size used when scanning every experiment to filter by metric. */
const SCAN_PAGE_SIZE = 200;

/**
 * Parse the `--metric-role` flag into a canonical, deduped list of roles.
 * An empty/undefined value means "all roles". Invalid values throw.
 */
export function parseMetricRoles(input?: string): MetricRole[] {
  if (!input || !input.trim()) return [...ALL_METRIC_ROLES];

  const requested = input
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const invalid = requested.filter((r) => !ALL_METRIC_ROLES.includes(r as MetricRole));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid metric role(s): ${invalid.join(', ')}. Valid roles: ${ALL_METRIC_ROLES.join(', ')}.`
    );
  }

  return ALL_METRIC_ROLES.filter((r) => requested.includes(r));
}

/**
 * Return the roles a given metric plays in a single experiment, restricted to
 * the requested roles, in canonical order. Returns [] if the metric is not used
 * in any requested role.
 */
export function experimentMetricRoles(
  exp: Record<string, unknown>,
  metricId: MetricId,
  requestedRoles: MetricRole[]
): MetricRole[] {
  const requested = new Set(requestedRoles);
  const target = Number(metricId);
  const found = new Set<MetricRole>();

  if (requested.has('primary') && Number(exp.primary_metric_id) === target) {
    found.add('primary');
  }

  const secondary = exp.secondary_metrics as Array<Record<string, unknown>> | undefined;
  if (secondary) {
    for (const sm of secondary) {
      if (Number(sm.metric_id) !== target) continue;
      const role = ((sm.type as string) || 'secondary') as MetricRole;
      if (requested.has(role)) found.add(role);
    }
  }

  return ALL_METRIC_ROLES.filter((r) => found.has(r));
}

/**
 * Filter experiments to those using the metric in a requested role, returning
 * shallow clones tagged with a `metric_role` field (the matched roles, joined).
 * Source objects are not mutated.
 */
export function filterExperimentsByMetric(
  experiments: Array<Record<string, unknown>>,
  metricId: MetricId,
  requestedRoles: MetricRole[]
): Array<Record<string, unknown>> {
  const matched: Array<Record<string, unknown>> = [];
  for (const exp of experiments) {
    const roles = experimentMetricRoles(exp, metricId, requestedRoles);
    if (roles.length === 0) continue;
    matched.push({ ...exp, metric_role: roles.join(', ') });
  }
  return matched;
}

/**
 * Fetch every experiment matching `baseOptions` by paging through the API at a
 * fixed page size until a short page is returned. `page`/`items` in
 * `baseOptions` are ignored (overridden per page).
 */
export async function fetchAllExperiments(
  client: APIClient,
  baseOptions: ListOptions
): Promise<Array<Record<string, unknown>>> {
  const all: Array<Record<string, unknown>> = [];
  let page = 1;

  for (;;) {
    const batch = (await client.listExperiments({
      ...baseOptions,
      page,
      items: SCAN_PAGE_SIZE,
    })) as Array<Record<string, unknown>>;
    all.push(...batch);
    if (batch.length < SCAN_PAGE_SIZE) break;
    page++;
  }

  return all;
}

/**
 * Resolve a `--metric` argument (numeric ID or metric name) to its ID and name.
 * Numeric values are looked up by ID (validating existence and fetching the
 * name). Names are matched exactly and case-insensitively; archived/draft
 * metrics are not in the name search and must be referenced by ID.
 */
export async function resolveMetricId(
  client: APIClient,
  nameOrId: string
): Promise<{ id: MetricId; name: string }> {
  const asInt = parseInt(nameOrId, 10);
  if (!isNaN(asInt) && String(asInt) === nameOrId.trim()) {
    const id = MetricId(asInt);
    const metric = await client.getMetric(id);
    return { id, name: (metric.name as string) ?? String(asInt) };
  }

  const metrics = await client.listMetrics({ search: nameOrId, items: SCAN_PAGE_SIZE });
  const exact = metrics.filter(
    (m) => String(m.name ?? '').toLowerCase() === nameOrId.toLowerCase()
  );

  if (exact.length === 0) {
    throw new Error(
      `No metric found matching name "${nameOrId}". Use a numeric metric ID, or check the name ` +
        `(archived/draft metrics must be referenced by ID).`
    );
  }

  const byId = new Map(exact.map((m) => [Number(m.id), m]));
  if (byId.size > 1) {
    const candidates = [...byId.values()].map((m) => `  ${m.id} ${m.name}`).join('\n');
    throw new Error(
      `Multiple metrics match name "${nameOrId}":\n${candidates}\nUse a numeric metric ID to disambiguate.`
    );
  }

  const match = exact[0]!;
  return { id: MetricId(Number(match.id)), name: match.name as string };
}
