import {
  formatExtraField,
  formatImpact,
  formatConfidence,
  formatProgress,
  formatOwnerName,
  formatDate,
} from './format-helpers.js';

export function summarizeExperiment(
  exp: Record<string, unknown>,
  extraFields: string[] = [],
  excludeFields: string[] = []
): Record<string, unknown> {
  const apps = exp.applications as Array<Record<string, unknown>> | undefined;
  const unitType = exp.unit_type as Record<string, unknown> | undefined;
  const primaryMetric = exp.primary_metric as Record<string, unknown> | undefined;
  const variants = exp.variants as Array<Record<string, unknown>> | undefined;
  const owners = exp.owners as Array<Record<string, unknown>> | undefined;
  const teams = exp.teams as Array<Record<string, unknown>> | undefined;
  const tags = exp.experiment_tags as Array<Record<string, unknown>> | undefined;
  const secondaryMetrics = exp.secondary_metrics as Array<Record<string, unknown>> | undefined;

  const summary: Record<string, unknown> = {
    id: exp.id,
    name: exp.name,
    display_name: exp.display_name ?? '',
    type: exp.type,
    state: exp.state,
    application:
      apps?.map((a) => (a.application as Record<string, unknown>)?.name ?? a.name).join(', ') ?? '',
    unit_type: unitType?.name ?? '',
    percentage_of_traffic: exp.percentage_of_traffic,
    primary_metric: primaryMetric?.name ?? '',
    variants: variants?.map((v) => v.name || `variant ${v.variant}`).join(', ') ?? '',
    percentages: exp.percentages ?? '',
  };

  if (secondaryMetrics && secondaryMetrics.length > 0) {
    const secondary = secondaryMetrics.filter((m) => m.type === 'secondary' || !m.type);
    const guardrail = secondaryMetrics.filter((m) => m.type === 'guardrail');
    const exploratory = secondaryMetrics.filter((m) => m.type === 'exploratory');

    if (secondary.length > 0) {
      summary.secondary_metrics = secondary
        .map((m) => (m.metric as Record<string, unknown>)?.name ?? m.metric_id)
        .join(', ');
    }
    if (guardrail.length > 0) {
      summary.guardrail_metrics = guardrail
        .map((m) => (m.metric as Record<string, unknown>)?.name ?? m.metric_id)
        .join(', ');
    }
    if (exploratory.length > 0) {
      summary.exploratory_metrics = exploratory
        .map((m) => (m.metric as Record<string, unknown>)?.name ?? m.metric_id)
        .join(', ');
    }
  }

  const previewVariants = exp.preview_variants as Array<Record<string, unknown>> | undefined;
  const primaryMetricId = exp.primary_metric_id as number | undefined;
  if (previewVariants && primaryMetricId) {
    const primaryResults = previewVariants.filter(
      (v) => v.metric_id === primaryMetricId && (v.variant as number) > 0
    );
    for (const result of primaryResults) {
      const variantIdx = result.variant as number;
      const variantName =
        variants?.find((v) => v.variant === variantIdx)?.name || `variant ${variantIdx}`;
      const parts: string[] = [];

      const unitCount = Number(result.unit_count);
      if (unitCount > 0) parts.push(`n=${unitCount.toLocaleString()}`);

      const impact = result.impact as number | null | undefined;
      if (typeof impact === 'number' && Number.isFinite(impact))
        parts.push(`impact=${(impact * 100).toFixed(2)}%`);

      const pvalue = result.pvalue as number | null | undefined;
      if (typeof pvalue === 'number' && Number.isFinite(pvalue))
        parts.push(`p=${pvalue < 0.001 ? '<0.001' : pvalue.toFixed(4)}`);

      const impactLower = result.impact_lower as number | null | undefined;
      const impactUpper = result.impact_upper as number | null | undefined;
      if (
        typeof impactLower === 'number' &&
        Number.isFinite(impactLower) &&
        typeof impactUpper === 'number' &&
        Number.isFinite(impactUpper)
      ) {
        parts.push(`CI=[${(impactLower * 100).toFixed(2)}%, ${(impactUpper * 100).toFixed(2)}%]`);
      }

      if (parts.length > 0) {
        summary[`result (${variantName})`] = parts.join('  ');
      }
    }
  }

  summary.owners = owners?.map((o) => formatOwnerName(o)).join(', ') ?? '';
  summary.teams =
    teams
      ?.map((t) => (t.team as Record<string, unknown>)?.name ?? t.name ?? '')
      .filter(Boolean)
      .join(', ') ?? '';
  summary.tags =
    tags
      ?.map(
        (t) =>
          (t.tag as Record<string, unknown>)?.name ??
          (t.experiment_tag as Record<string, unknown>)?.tag ??
          t.tag ??
          ''
      )
      .filter(Boolean)
      .join(', ') ?? '';
  summary.created_at = formatDate(exp.created_at);
  summary.updated_at = formatDate(exp.updated_at);
  summary.start_at = formatDate(exp.start_at);
  summary.stop_at = formatDate(exp.stop_at);

  const customFieldValues = exp.custom_section_field_values as
    | Array<Record<string, unknown>>
    | undefined;
  const customFields = new Map<string, string>();
  if (customFieldValues) {
    for (const cfv of customFieldValues) {
      const field = cfv.custom_section_field as Record<string, unknown> | undefined;
      const title = (field?.title as string) ?? '';
      const value = (cfv.value as string) ?? '';
      if (title) customFields.set(title.toLowerCase(), value);
    }
  }

  for (const field of extraFields) {
    if (field in summary) continue;

    if (field in exp) {
      summary[field] = formatExtraField(field, exp[field]);
    } else {
      const customValue = customFields.get(field.toLowerCase());
      if (customValue !== undefined) {
        summary[field] = customValue;
      }
    }
  }

  if (excludeFields.length > 0) {
    for (const field of excludeFields) delete summary[field];
  }

  return summary;
}

export function stateToDate(state: string, exp: Record<string, unknown>): string {
  let date: string | undefined;
  switch (state) {
    case 'running':
      date = exp.start_at as string;
      break;
    case 'stopped':
      date = exp.stop_at as string;
      break;
    case 'archived':
      date = exp.stop_at as string;
      break;
    default:
      date = exp.created_at as string;
      break;
  }
  return formatDate(date);
}

const DEFAULT_ROW_EXCLUDES = ['unit_type', 'traffic', 'owner'];

export function summarizeExperimentRow(
  exp: Record<string, unknown>,
  extraFields: string[] = [],
  excludeFields: string[] = []
): Record<string, unknown> {
  const showSet = new Set(extraFields.map((f) => f.toLowerCase()));
  const effectiveExcludes = [
    ...DEFAULT_ROW_EXCLUDES.filter((f) => !showSet.has(f)),
    ...excludeFields,
  ];
  excludeFields = effectiveExcludes;
  const apps = exp.applications as Array<Record<string, unknown>> | undefined;
  const unitType = exp.unit_type as Record<string, unknown> | undefined;
  const primaryMetric = exp.primary_metric as Record<string, unknown> | undefined;
  const owners = exp.owners as Array<Record<string, unknown>> | undefined;

  const state = exp.state as string;
  const stateDate = stateToDate(state, exp);

  const row: Record<string, unknown> = {
    id: exp.id,
    name: exp.name,
    type: exp.type,
    state,
    state_since: stateDate,
    app:
      apps?.map((a) => (a.application as Record<string, unknown>)?.name ?? a.name).join(', ') ?? '',
    unit_type: unitType?.name ?? '',
    traffic: `${exp.percentage_of_traffic}%`,
    primary_metric: primaryMetric?.name ?? '',
    owner: owners?.map((o) => formatOwnerName(o)).join(', ') ?? '',
    percentages: exp.percentages ?? '',
    impact: formatImpact(exp),
    confidence: formatConfidence(exp),
    progress: formatProgress(exp),
  };

  for (const field of extraFields) {
    if (!(field in row) && field in exp) {
      row[field] = formatExtraField(field, exp[field]);
    }
  }

  if (excludeFields.length > 0) {
    for (const field of excludeFields) delete row[field];
  }

  return row;
}
