import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseMetricId } from '../../lib/utils/validators.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';
import { extractMetricInfos, extractVariantNames, fetchAllMetricResults, formatResultRows, metricOwners } from '../../api-client/metric-results.js';

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
      rows.push({ id: exp.primary_metric_id, name: primary.name, type: 'primary', owners: metricOwners(primary) });
    }

    const secondary = exp.secondary_metrics as Array<Record<string, unknown>> | undefined;
    if (secondary) {
      for (const m of secondary) {
        const metric = m.metric as Record<string, unknown> | undefined;
        rows.push({ id: m.metric_id, name: metric?.name || m.metric_id, type: m.type || 'secondary', owners: metricOwners(metric) });
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

const resultsCommand = new Command('results')
  .description('Show metric results for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(resultsCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);
    const exp = experiment as Record<string, unknown>;
    const metricInfos = extractMetricInfos(exp);
    const variantNames = extractVariantNames(exp);

    if (metricInfos.length === 0) {
      console.log(chalk.blue('No metrics assigned to this experiment.'));
      return;
    }

    console.log(chalk.gray(`Fetching results for ${metricInfos.length} metrics...`));
    const results = await fetchAllMetricResults(client, id, metricInfos);

    const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
    if (useRaw) {
      printFormatted(results, globalOptions);
    } else {
      const rows = results.flatMap(r => formatResultRows(r, variantNames));
      printFormatted(rows, globalOptions);
    }
  }));

const depsCommand = new Command('deps')
  .description('Show metric usage/dependency stats')
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (metricId: MetricId) => {
    const globalOptions = getGlobalOptions(depsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const allUsages = await client.listMetricUsages();

    const metric = allUsages.find((m: unknown) => {
      const rec = m as Record<string, unknown>;
      return rec.id === metricId;
    }) as Record<string, unknown> | undefined;

    if (!metric) {
      console.log(chalk.yellow(`No usage data found for metric ${metricId}`));
      return;
    }

    const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
    if (useRaw) {
      printFormatted(metric, globalOptions);
      return;
    }

    const meta = (metric.metric_shared_metadata ?? {}) as Record<string, unknown>;
    const usage = (metric.usage ?? {}) as Record<string, Record<string, unknown>>;
    const allTime = usage.all_time ?? {};
    const lastMonth = usage.last_month ?? {};
    const last6Months = usage.last_6_months ?? {};
    const lastYear = usage.last_year ?? {};

    console.log(chalk.bold(`\nMetric: ${meta.name ?? metricId} (ID: ${metricId})\n`));

    console.log(chalk.bold('All-time usage:'));
    console.log(`  Total: ${allTime.total ?? 0}`);
    console.log(`  Primary: ${allTime.primary ?? 0}`);
    console.log(`  Secondary: ${allTime.secondary ?? 0}`);
    console.log(`  Guardrail: ${allTime.guardrail ?? 0}`);

    console.log(chalk.bold('\nRecent usage:'));
    console.log(`  Last month: ${lastMonth.total ?? 0}`);
    console.log(`  Last 6 months: ${last6Months.total ?? 0}`);
    console.log(`  Last year: ${lastYear.total ?? 0}`);
  }));

metricsCommand.addCommand(resultsCommand);
metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(addCommand);
metricsCommand.addCommand(confirmImpactCommand);
metricsCommand.addCommand(excludeCommand);
metricsCommand.addCommand(includeCommand);
metricsCommand.addCommand(removeImpactCommand);
metricsCommand.addCommand(depsCommand);
