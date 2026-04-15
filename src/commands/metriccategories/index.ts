import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseTagId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { TagId } from '../../lib/api/branded-types.js';
import {
  getMetricCategory,
  createMetricCategory,
  updateMetricCategory,
  archiveMetricCategory,
} from '../../core/metriccategories/index.js';

export const metricCategoriesCommand = new Command('metric-categories')
  .alias('metriccategories')
  .alias('metriccategory')
  .alias('metric-category')
  .alias('metric-cats')
  .description('Metric category commands');

const listCommand = createListCommand({
  description: 'List all metric categories',
  fetch: (client, options) =>
    client.listMetricCategories({
      items: options.items as number,
      page: options.page as number,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sort_asc: options.asc ? true : options.desc ? false : undefined,
      archived: options.archived as boolean,
      ids: options.ids as string | undefined,
    }),
});

const getCommand = new Command('get')
  .description('Get metric category details')
  .argument('<id>', 'category ID', parseTagId)
  .action(
    withErrorHandling(async (id: TagId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getMetricCategory(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new metric category')
  .requiredOption('--name <name>', 'category name')
  .option('--description <text>', 'category description')
  .requiredOption('--color <color>', 'category color (e.g., #FF5733)')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createMetricCategory(client, {
        name: options.name,
        description: options.description,
        color: options.color,
      });
      console.log(chalk.green('Metric category created successfully'));
      printFormatted(result.data, globalOptions);
    })
  );

const updateCommand = new Command('update')
  .description('Update a metric category')
  .argument('<id>', 'category ID', parseTagId)
  .option('--name <name>', 'new category name')
  .option('--description <text>', 'new category description')
  .option('--color <color>', 'new category color')
  .action(
    withErrorHandling(async (id: TagId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await updateMetricCategory(client, {
        id,
        name: options.name,
        description: options.description,
        color: options.color,
      });
      console.log(chalk.green('Metric category updated successfully'));
      printFormatted(result.data, globalOptions);
    })
  );

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a metric category')
  .argument('<id>', 'category ID', parseTagId)
  .option('--unarchive', 'Unarchive the metric category')
  .action(
    withErrorHandling(async (id: TagId, options) => {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await archiveMetricCategory(client, { id, unarchive: options.unarchive });
      console.log(
        chalk.green(`Metric category ${options.unarchive ? 'unarchived' : 'archived'} successfully`)
      );
    })
  );

metricCategoriesCommand.addCommand(listCommand);
metricCategoriesCommand.addCommand(getCommand);
metricCategoriesCommand.addCommand(createCommand);
metricCategoriesCommand.addCommand(updateCommand);
metricCategoriesCommand.addCommand(archiveCommand);
