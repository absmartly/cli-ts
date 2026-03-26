import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseMetricId } from '../../lib/utils/validators.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { extractMetricInfos, extractVariantNames, fetchAllMetricResults, formatResultRows, metricOwners, parseCachedMetricData, type MetricInfo } from '../../api-client/metric-results.js';

export const metricsCommand = new Command('metrics')
  .description('Manage experiment metrics');

const listCommand = new Command('list')
  .description('List metrics for an experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .action(withErrorHandling(async (nameOrId: string) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);
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
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .requiredOption('--metrics <ids>', 'comma-separated metric IDs')
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(addCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);
    const metricIds = options.metrics.split(',').map((s: string) => parseMetricId(s.trim()));
    await client.addExperimentMetrics(id, metricIds);
    console.log(chalk.green(`✓ Metrics added to experiment ${id}`));
  }));

const confirmImpactCommand = new Command('confirm-impact')
  .description('Confirm metric impact for an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(confirmImpactCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const experimentId = await client.resolveExperimentId(experimentNameOrId);
    await client.confirmMetricImpact(experimentId, metricId);
    console.log(chalk.green(`✓ Metric impact confirmed for experiment ${experimentId}, metric ${metricId}`));
  }));

const excludeCommand = new Command('exclude')
  .description('Exclude a metric from an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(excludeCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const experimentId = await client.resolveExperimentId(experimentNameOrId);
    await client.excludeExperimentMetric(experimentId, metricId);
    console.log(chalk.green(`✓ Metric ${metricId} excluded from experiment ${experimentId}`));
  }));

const includeCommand = new Command('include')
  .description('Include a metric in an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(includeCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const experimentId = await client.resolveExperimentId(experimentNameOrId);
    await client.includeExperimentMetric(experimentId, metricId);
    console.log(chalk.green(`✓ Metric ${metricId} included in experiment ${experimentId}`));
  }));

const removeImpactCommand = new Command('remove-impact')
  .description('Remove metric impact from an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(removeImpactCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const experimentId = await client.resolveExperimentId(experimentNameOrId);
    await client.removeMetricImpact(experimentId, metricId);
    console.log(chalk.green(`✓ Metric impact removed for experiment ${experimentId}, metric ${metricId}`));
  }));

const resultsCommand = new Command('results')
  .description('Show metric results for an experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--metric <id>', 'specific metric ID (can query any metric, not just assigned ones)', parseInt)
  .option('--segment <names...>', 'segment names or IDs for breakdown (e.g. Device Country)')
  .option('--filter <json>', 'raw segment filter JSON payload')
  .option('--from <date>', 'start time filter (see date formats)')
  .option('--to <date>', 'end time filter (see date formats)')
  .option('--cached', 'use previewer cached results instead of querying the engine')
  .option('--ci-bar', 'show visual CI bar instead of text [lower, upper]')
  .option('--variant-index', 'use variant index (0, 1, 2) instead of names')
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(resultsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);

    const experiment = await client.getExperiment(id);
    const exp = experiment as Record<string, unknown>;
    const variantNames = extractVariantNames(exp);

    const metricInfos: MetricInfo[] = options.metric
      ? [await (async () => {
          const metric = await client.getMetric(options.metric);
          const m = metric as Record<string, unknown>;
          return { id: options.metric as MetricId, name: m.name as string ?? String(options.metric), type: 'custom', effect: m.effect as string };
        })()]
      : extractMetricInfos(exp);

    if (metricInfos.length === 0) {
      console.log(chalk.blue('No metrics assigned to this experiment.'));
      return;
    }

    const formatOpts = { ciBar: options.ciBar, variantIndex: options.variantIndex };

    if (options.cached) {
      console.log(chalk.gray('Fetching cached previewer results...'));
      const cached = await client.getExperimentMetricsCached(id);
      const results = parseCachedMetricData(metricInfos, cached);

      const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
      if (useRaw) {
        printFormatted({ results, snapshot_data: cached.snapshot_data, pending_update_request: cached.pending_update_request }, globalOptions);
      } else {
        if (cached.snapshot_data) {
          const snap = cached.snapshot_data;
          if (snap.updated_at) console.log(chalk.gray(`Last updated: ${new Date(snap.updated_at as string).toLocaleString()}`));
        }
        if (cached.pending_update_request) {
          console.log(chalk.yellow('⏳ An update is currently pending'));
        }
        const rows = results.flatMap(r => formatResultRows(r, variantNames, formatOpts));
        printFormatted(rows, globalOptions);
      }
      return;
    }

    const baseFilters: Record<string, unknown> = {};
    if (options.filter) baseFilters.segments = options.filter;
    const fromTs = parseDateFlagOrUndefined(options.from);
    const toTs = parseDateFlagOrUndefined(options.to);
    if (fromTs !== undefined) baseFilters.from = fromTs;
    if (toTs !== undefined) baseFilters.to = toTs;

    let segmentIds: number[] = [];
    if (options.segment) {
      const segRefs = options.segment as string[];
      const allSegments = await client.listSegments(200, 1);
      for (const ref of segRefs) {
        const asInt = parseInt(ref, 10);
        if (!isNaN(asInt) && String(asInt) === ref.trim()) {
          segmentIds.push(asInt);
        } else {
          const match = allSegments.find(s => (s as Record<string, unknown>).name?.toString().toLowerCase() === ref.toLowerCase());
          if (!match) {
            const available = allSegments.map(s => `  ${s.id} ${(s as Record<string, unknown>).name}`).join('\n');
            throw new Error(`Segment "${ref}" not found. Available segments:\n${available}`);
          }
          segmentIds.push(match.id);
        }
      }
    }

    const hasFilters = Object.keys(baseFilters).length > 0;

    if (segmentIds.length <= 1) {
      const body = segmentIds.length === 1
        ? { segment_id: segmentIds[0], ...(hasFilters && { filters: baseFilters }) } as any
        : hasFilters ? { filters: baseFilters } as any : undefined;

      console.log(chalk.gray(`Fetching results for ${metricInfos.length} metric(s)...`));
      const results = await fetchAllMetricResults(client, id, metricInfos, body);

      const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
      if (useRaw) {
        printFormatted(results, globalOptions);
      } else {
        const rows = results.flatMap(r => formatResultRows(r, variantNames, formatOpts));
        printFormatted(rows, globalOptions);
      }
    } else {
      console.log(chalk.gray(`Fetching results for ${metricInfos.length} metric(s) across ${segmentIds.length} segments...`));
      const allRows: Record<string, unknown>[] = [];

      for (const segId of segmentIds) {
        const body = { segment_id: segId, ...(hasFilters && { filters: baseFilters }) } as any;
        const results = await fetchAllMetricResults(client, id, metricInfos, body);
        const rows = results.flatMap(r => formatResultRows(r, variantNames, formatOpts));
        allRows.push(...rows);
      }

      printFormatted(allRows, globalOptions);
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
