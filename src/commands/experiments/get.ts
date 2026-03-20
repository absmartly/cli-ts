import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling, resolveEndpoint, resolveAPIKey } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { formatExtraField } from './format-helpers.js';

function summarizeExperiment(exp: Record<string, unknown>, extraFields: string[] = []): Record<string, unknown> {
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
    application: apps?.map(a => (a.application as Record<string, unknown>)?.name ?? a.name).join(', ') ?? '',
    unit_type: unitType?.name ?? '',
    percentage_of_traffic: exp.percentage_of_traffic,
    primary_metric: primaryMetric?.name ?? '',
    variants: variants?.map(v => v.name || `variant ${v.variant}`).join(', ') ?? '',
    percentages: exp.percentages ?? '',
  };

  if (secondaryMetrics && secondaryMetrics.length > 0) {
    const secondary = secondaryMetrics.filter(m => m.type === 'secondary' || !m.type);
    const guardrail = secondaryMetrics.filter(m => m.type === 'guardrail');
    const exploratory = secondaryMetrics.filter(m => m.type === 'exploratory');

    if (secondary.length > 0) {
      summary.secondary_metrics = secondary.map(m => (m.metric as Record<string, unknown>)?.name ?? m.metric_id).join(', ');
    }
    if (guardrail.length > 0) {
      summary.guardrail_metrics = guardrail.map(m => (m.metric as Record<string, unknown>)?.name ?? m.metric_id).join(', ');
    }
    if (exploratory.length > 0) {
      summary.exploratory_metrics = exploratory.map(m => (m.metric as Record<string, unknown>)?.name ?? m.metric_id).join(', ');
    }
  }

  const previewVariants = exp.preview_variants as Array<Record<string, unknown>> | undefined;
  const primaryMetricId = exp.primary_metric_id as number | undefined;
  if (previewVariants && primaryMetricId) {
    const primaryResults = previewVariants.filter(v => v.metric_id === primaryMetricId && (v.variant as number) > 0);
    for (const result of primaryResults) {
      const variantIdx = result.variant as number;
      const variantName = variants?.find(v => v.variant === variantIdx)?.name || `variant ${variantIdx}`;
      const parts: string[] = [];

      const unitCount = Number(result.unit_count);
      if (unitCount > 0) parts.push(`n=${unitCount.toLocaleString()}`);

      const impact = result.impact as number | null;
      if (impact !== null) parts.push(`impact=${(impact * 100).toFixed(2)}%`);

      const pvalue = result.pvalue as number | null;
      if (pvalue !== null) parts.push(`p=${pvalue < 0.001 ? '<0.001' : pvalue.toFixed(4)}`);

      const impactLower = result.impact_lower as number | null;
      const impactUpper = result.impact_upper as number | null;
      if (impactLower !== null && impactUpper !== null) {
        parts.push(`CI=[${(impactLower * 100).toFixed(2)}%, ${(impactUpper * 100).toFixed(2)}%]`);
      }

      if (parts.length > 0) {
        summary[`result (${variantName})`] = parts.join('  ');
      }
    }
  }

  summary.owners = owners?.map(o => {
    const user = o.user as Record<string, unknown> | undefined;
    if (user) return `${user.first_name} ${user.last_name}`;
    return `user ${o.user_id}`;
  }).join(', ') ?? '';
  summary.teams = teams?.map(t => t.name).join(', ') ?? '';
  summary.tags = tags?.map(t => (t.tag as Record<string, unknown>)?.name ?? '').join(', ') ?? '';
  summary.created_at = exp.created_at ?? '';
  summary.updated_at = exp.updated_at ?? '';
  summary.start_at = exp.start_at ?? '';
  summary.stop_at = exp.stop_at ?? '';

  const customFieldValues = exp.custom_section_field_values as Array<Record<string, unknown>> | undefined;
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

  return summary;
}

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--activity', 'include activity notes in the output')
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields in summary (e.g. --show audience archived)')
  .option('--embed-screenshots', 'embed screenshots as base64 data URIs in template output')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);

    if (globalOptions.output === 'template') {
      const md = await experimentToMarkdown(experiment, {
        embedScreenshots: options.embedScreenshots,
        apiEndpoint: resolveEndpoint(globalOptions),
        ...(options.embedScreenshots && { apiKey: await resolveAPIKey(globalOptions) }),
      });
      console.log(md);
      return;
    }

    const useRaw = options.raw || globalOptions.output === 'json' || globalOptions.output === 'yaml';
    const extraFields = (options.show as string[] | undefined) ?? [];

    if (options.activity) {
      const notes = await client.listExperimentActivity(id);
      const data = useRaw ? { ...experiment, activity: notes } : summarizeExperiment(experiment as Record<string, unknown>, extraFields);
      printFormatted(data, globalOptions);
    } else {
      const data = useRaw ? experiment : summarizeExperiment(experiment as Record<string, unknown>, extraFields);
      printFormatted(data, globalOptions);
    }
  }));
