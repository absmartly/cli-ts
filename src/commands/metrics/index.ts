import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseMetricId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { addPaginationOptions, printPaginationFooter } from '../../lib/utils/pagination.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeMetric, summarizeMetricRow } from '../../api-client/entity-summary.js';
import { accessCommand } from './access.js';
import { reviewCommand } from './review.js';
import { followCommand, unfollowCommand } from './follow.js';

export const metricsCommand = new Command('metrics')
  .alias('metric')
  .description('Metric commands');

const listCommand = addPaginationOptions(
  new Command('list')
    .description('List all metrics')
    .option('--archived', 'include archived metrics')
    .option('--raw', 'show full API response without summarizing')
    .option('--show <fields...>', 'include additional fields from API response')
    .option('--exclude <fields...>', 'hide fields from summary'),
  100,
).action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const metrics = await client.listMetrics({ items: options.items, page: options.page, archived: options.archived });
    const data = options.raw ? metrics : (metrics as Array<Record<string, unknown>>).map(m => applyShowExclude(summarizeMetricRow(m), m, show, exclude));
    printFormatted(data, globalOptions);
    printPaginationFooter(metrics.length, options.items, options.page);
  }));

const getCommand = new Command('get')
  .description('Get metric details')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const metric = await client.getMetric(id);
    const data = options.raw ? metric : applyShowExclude(summarizeMetric(metric as Record<string, unknown>), metric as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new metric')
  .requiredOption('--name <name>', 'metric name')
  .option('--type <type>', 'metric type')
  .option('--description <text>', 'metric description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const metric = await client.createMetric({
      name: options.name,
      type: options.type,
      description: options.description,
    });

    console.log(chalk.green(`✓ Metric created with ID: ${metric.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.description !== undefined) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateMetric(id, data);
    console.log(chalk.green(`✓ Metric ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--unarchive', 'unarchive the metric')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveMetric(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Metric ${id} ${action}`));
  }));

const activateCommand = new Command('activate')
  .description('Activate a metric version')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--reason <text>', 'reason for activation')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(activateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.activateMetric(id, options.reason);
    console.log(chalk.green(`✓ Metric ${id} activated`));
  }));

metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(getCommand);
metricsCommand.addCommand(createCommand);
metricsCommand.addCommand(updateCommand);
metricsCommand.addCommand(archiveCommand);
metricsCommand.addCommand(activateCommand);
metricsCommand.addCommand(accessCommand);
metricsCommand.addCommand(reviewCommand);
metricsCommand.addCommand(followCommand);
metricsCommand.addCommand(unfollowCommand);
