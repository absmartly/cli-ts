import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseMetricId } from '../../lib/utils/validators.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';
import { renderCIBar, formatPct } from './format-helpers.js';

export const metricsCommand = new Command('metrics')
  .description('Manage experiment metrics');

const listCommand = new Command('list')
  .description('List metrics for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const experiment = await client.getExperiment(id);
    const exp = experiment as Record<string, unknown>;

    const rows: Array<Record<string, unknown>> = [];

    const primary = exp.primary_metric as Record<string, unknown> | undefined;
    if (primary) {
      rows.push({ id: exp.primary_metric_id, name: primary.name, type: 'primary' });
    }

    const secondary = exp.secondary_metrics as Array<Record<string, unknown>> | undefined;
    if (secondary) {
      for (const m of secondary) {
        const metric = m.metric as Record<string, unknown> | undefined;
        rows.push({ id: m.metric_id, name: metric?.name || m.metric_id, type: m.type || 'secondary' });
      }
    }

    if (rows.length === 0) {
      console.log(chalk.blue('No metrics assigned to this experiment.'));
      return;
    }

    printFormatted(rows, globalOptions);
  }));

const addCommand = new Command('add')
  .description('Add metrics to an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--metrics <ids>', 'comma-separated metric IDs')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(addCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const metricIds = options.metrics.split(',').map((s: string) => parseMetricId(s.trim()));
    await client.addExperimentMetrics(id, metricIds);
    console.log(chalk.green(`✓ Metrics added to experiment ${id}`));
  }));

const confirmImpactCommand = new Command('confirm-impact')
  .description('Confirm metric impact for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(confirmImpactCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.confirmMetricImpact(experimentId, metricId);
    console.log(chalk.green(`✓ Metric impact confirmed for experiment ${experimentId}, metric ${metricId}`));
  }));

const excludeCommand = new Command('exclude')
  .description('Exclude a metric from an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(excludeCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.excludeExperimentMetric(experimentId, metricId);
    console.log(chalk.green(`✓ Metric ${metricId} excluded from experiment ${experimentId}`));
  }));

const includeCommand = new Command('include')
  .description('Include a metric in an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(includeCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.includeExperimentMetric(experimentId, metricId);
    console.log(chalk.green(`✓ Metric ${metricId} included in experiment ${experimentId}`));
  }));

const removeImpactCommand = new Command('remove-impact')
  .description('Remove metric impact from an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(removeImpactCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.removeMetricImpact(experimentId, metricId);
    console.log(chalk.green(`✓ Metric impact removed for experiment ${experimentId}, metric ${metricId}`));
  }));

interface MetricResult {
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

function parseMetricData(
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

function formatResultRow(r: MetricResult, variantNames: Map<number, string>): Record<string, unknown> {
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

const resultsCommand = new Command('results')
  .description('Show metric results for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(resultsCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);
    const exp = experiment as Record<string, unknown>;

    const primaryMetric = exp.primary_metric as Record<string, unknown> | undefined;
    const primaryMetricId = exp.primary_metric_id as number | undefined;
    const secondaryMetrics = exp.secondary_metrics as Array<Record<string, unknown>> | undefined;
    const variants = exp.variants as Array<Record<string, unknown>> | undefined;

    const variantNames = new Map<number, string>();
    if (variants) {
      for (const v of variants) variantNames.set(v.variant as number, (v.name as string) || `v${v.variant}`);
    }

    const metricInfos: Array<{ id: number; name: string; type: string }> = [];
    if (primaryMetricId && primaryMetric) {
      metricInfos.push({ id: primaryMetricId, name: primaryMetric.name as string, type: 'primary' });
    }
    if (secondaryMetrics) {
      for (const m of secondaryMetrics) {
        const metric = m.metric as Record<string, unknown> | undefined;
        metricInfos.push({
          id: m.metric_id as number,
          name: (metric?.name as string) || String(m.metric_id),
          type: (m.type as string) || 'secondary',
        });
      }
    }

    if (metricInfos.length === 0) {
      console.log(chalk.blue('No metrics assigned to this experiment.'));
      return;
    }

    console.log(chalk.gray(`Fetching results for ${metricInfos.length} metrics...`));

    const dataPromises = metricInfos.map(m => client.getExperimentMetricData(id, m.id));
    const allData = await Promise.all(dataPromises);

    const results: MetricResult[] = [];
    for (let i = 0; i < metricInfos.length; i++) {
      const info = metricInfos[i]!;
      const data = allData[i]!;
      const parsed = parseMetricData(info.id, data);
      results.push({ metric_id: info.id, name: info.name, type: info.type, variants: parsed });
    }

    const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
    if (useRaw) {
      printFormatted(results, globalOptions);
    } else {
      const rows = results.map(r => formatResultRow(r, variantNames));
      printFormatted(rows, globalOptions);
    }
  }));

metricsCommand.addCommand(resultsCommand);
metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(addCommand);
metricsCommand.addCommand(confirmImpactCommand);
metricsCommand.addCommand(excludeCommand);
metricsCommand.addCommand(includeCommand);
metricsCommand.addCommand(removeImpactCommand);
