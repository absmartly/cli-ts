import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const metricsCommand = new Command('metrics')
  .alias('metric')
  .description('Metric commands');

const listCommand = new Command('list')
  .description('List all metrics')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const metrics = await client.listMetrics(options.limit, options.offset);
    printFormatted(metrics, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get metric details')
  .argument('<id>', 'metric ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const metric = await client.getMetric(id);
    printFormatted(metric, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new metric')
  .requiredOption('--name <name>', 'metric name')
  .option('--display-name <name>', 'display name')
  .option('--type <type>', 'metric type')
  .option('--description <text>', 'metric description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const metric = await client.createMetric({
      name: options.name,
      display_name: options.displayName,
      type: options.type,
      description: options.description,
    });

    console.log(chalk.green(`✓ Metric created with ID: ${metric.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a metric')
  .argument('<id>', 'metric ID', parseInt)
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.displayName) data.display_name = options.displayName;
    if (options.description) data.description = options.description;

    await client.updateMetric(id, data);
    console.log(chalk.green(`✓ Metric ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a metric')
  .argument('<id>', 'metric ID', parseInt)
  .option('--unarchive', 'unarchive the metric')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveMetric(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Metric ${id} ${action}`));
  }));

metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(getCommand);
metricsCommand.addCommand(createCommand);
metricsCommand.addCommand(updateCommand);
metricsCommand.addCommand(archiveCommand);
