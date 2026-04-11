import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseMetricId } from '../../lib/utils/validators.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import {
  listExperimentMetrics,
  addExperimentMetrics,
  confirmMetricImpact,
  excludeExperimentMetric,
  includeExperimentMetric,
  removeMetricImpact,
  getMetricResults,
  getMetricDeps,
} from '../../core/experiments/metrics.js';

export const metricsCommand = new Command('metrics').description('Manage experiment metrics');

const listCommand = new Command('list')
  .description('List metrics for an experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .action(
    withErrorHandling(async (nameOrId: string) => {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

      const result = await listExperimentMetrics(client, { experimentId: id });

      if (result.data.length === 0) {
        console.error(chalk.blue('No metrics assigned to this experiment.'));
        return;
      }

      printFormatted(result.data, globalOptions);
    })
  );

const addCommand = new Command('add')
  .description('Add metrics to an experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .requiredOption('--metrics <ids>', 'comma-separated metric IDs')
  .action(
    withErrorHandling(async (nameOrId: string, options) => {
      const globalOptions = getGlobalOptions(addCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);
      const metricIds = options.metrics.split(',').map((s: string) => parseMetricId(s.trim()));
      await addExperimentMetrics(client, { experimentId: id, metricIds });
      console.log(chalk.green(`✓ Metrics added to experiment ${id}`));
    })
  );

const confirmImpactCommand = new Command('confirm-impact')
  .description('Confirm metric impact for an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
      const globalOptions = getGlobalOptions(confirmImpactCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const experimentId = await client.resolveExperimentId(experimentNameOrId);
      await confirmMetricImpact(client, { experimentId, metricId });
      console.log(
        chalk.green(`✓ Metric impact confirmed for experiment ${experimentId}, metric ${metricId}`)
      );
    })
  );

const excludeCommand = new Command('exclude')
  .description('Exclude a metric from an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
      const globalOptions = getGlobalOptions(excludeCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const experimentId = await client.resolveExperimentId(experimentNameOrId);
      await excludeExperimentMetric(client, { experimentId, metricId });
      console.log(chalk.green(`✓ Metric ${metricId} excluded from experiment ${experimentId}`));
    })
  );

const includeCommand = new Command('include')
  .description('Include a metric in an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
      const globalOptions = getGlobalOptions(includeCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const experimentId = await client.resolveExperimentId(experimentNameOrId);
      await includeExperimentMetric(client, { experimentId, metricId });
      console.log(chalk.green(`✓ Metric ${metricId} included in experiment ${experimentId}`));
    })
  );

const removeImpactCommand = new Command('remove-impact')
  .description('Remove metric impact from an experiment')
  .argument('<experimentId>', 'experiment ID or name', parseExperimentIdOrName)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (experimentNameOrId: string, metricId: MetricId) => {
      const globalOptions = getGlobalOptions(removeImpactCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const experimentId = await client.resolveExperimentId(experimentNameOrId);
      await removeMetricImpact(client, { experimentId, metricId });
      console.log(
        chalk.green(`✓ Metric impact removed for experiment ${experimentId}, metric ${metricId}`)
      );
    })
  );

const resultsCommand = new Command('results')
  .description('Show metric results for an experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option(
    '--metric <id>',
    'specific metric ID (can query any metric, not just assigned ones)',
    parseInt
  )
  .option('--segment <names...>', 'segment names or IDs for breakdown (e.g. Device Country)')
  .option('--filter <json>', 'raw segment filter JSON payload')
  .option('--from <date>', 'start time filter (see date formats)')
  .option('--to <date>', 'end time filter (see date formats)')
  .option('--cached', 'use previewer cached results instead of querying the engine')
  .option('--ci-bar', 'show visual CI bar instead of text [lower, upper]')
  .option('--variant-index', 'use variant index (0, 1, 2) instead of names')
  .action(
    withErrorHandling(async (nameOrId: string, options) => {
      const globalOptions = getGlobalOptions(resultsCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

      const result = await getMetricResults(client, {
        experimentId: id,
        metricId: options.metric,
        segment: options.segment,
        filter: options.filter,
        from: options.from,
        to: options.to,
        cached: options.cached,
        ciBar: options.ciBar,
        variantIndex: options.variantIndex,
        raw: globalOptions.raw,
        outputFormat: globalOptions.output as string,
      });

      if (result.data.results.length === 0 && result.data.formattedRows.length === 0) {
        console.error(chalk.blue('No metrics assigned to this experiment.'));
        return;
      }

      if (options.cached && !globalOptions.raw) {
        console.error(chalk.gray('Fetching cached previewer results...'));
        const meta = result.data.cachedMeta;
        const useStructured = globalOptions.output === 'json' || globalOptions.output === 'yaml';
        if (useStructured) {
          printFormatted(
            {
              results: result.data.results,
              snapshot_data: meta?.snapshotData,
              pending_update_request: meta?.pendingUpdateRequest,
            },
            globalOptions
          );
        } else {
          if (meta?.snapshotData) {
            const snap = meta.snapshotData;
            if (snap.updated_at)
              console.error(
                chalk.gray(`Last updated: ${new Date(snap.updated_at as string).toLocaleString()}`)
              );
          }
          if (meta?.pendingUpdateRequest) {
            console.error(chalk.yellow('⏳ An update is currently pending'));
          }
          printFormatted(result.data.formattedRows, globalOptions);
        }
        return;
      }

      if (result.data.formattedRows.length > 0) {
        console.error(chalk.gray(`Fetching results for metric(s)...`));
      }

      const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
      if (useRaw && result.data.results.length > 0) {
        printFormatted(result.data.results, globalOptions);
      } else {
        printFormatted(result.data.formattedRows, globalOptions);
      }
    })
  );

const depsCommand = new Command('deps')
  .description('Show metric usage/dependency stats')
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (metricId: MetricId) => {
      const globalOptions = getGlobalOptions(depsCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const result = await getMetricDeps(client, { metricId });

      if (!result.data) {
        console.error(chalk.yellow(`No usage data found for metric ${metricId}`));
        return;
      }

      const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
      if (useRaw) {
        printFormatted(result.data.metric, globalOptions);
        return;
      }

      const { meta, usage } = result.data;
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
    })
  );

metricsCommand.addCommand(resultsCommand);
metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(addCommand);
metricsCommand.addCommand(confirmImpactCommand);
metricsCommand.addCommand(excludeCommand);
metricsCommand.addCommand(includeCommand);
metricsCommand.addCommand(removeImpactCommand);
metricsCommand.addCommand(depsCommand);
