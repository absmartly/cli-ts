import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseTagId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { TagId } from '../../lib/api/branded-types.js';

export const metricCategoriesCommand = new Command('metric-categories')
  .alias('metriccategories')
  .alias('metriccategory')
  .alias('metric-category')
  .alias('metric-cats')
  .description('Metric category commands');

const listCommand = new Command('list')
  .description('List all metric categories')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const categories = await client.listMetricCategories(options.limit, options.offset);
    printFormatted(categories, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get metric category details')
  .argument('<id>', 'category ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const category = await client.getMetricCategory(id);
    printFormatted(category, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new metric category')
  .requiredOption('--name <name>', 'category name')
  .option('--description <text>', 'category description')
  .requiredOption('--color <color>', 'category color (e.g., #FF5733)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const category = await client.createMetricCategory({
      name: options.name,
      description: options.description,
      color: options.color,
    });

    console.log(chalk.green('Metric category created successfully'));
    printFormatted(category, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a metric category')
  .argument('<id>', 'category ID', parseTagId)
  .option('--name <name>', 'new category name')
  .option('--description <text>', 'new category description')
  .option('--color <color>', 'new category color')
  .action(withErrorHandling(async (id: TagId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: { name?: string; description?: string; color?: string } = {};
    if (options.name !== undefined) data.name = options.name;
    if (options.description !== undefined) data.description = options.description;
    if (options.color !== undefined) data.color = options.color;

    requireAtLeastOneField(data, 'update field');
    const category = await client.updateMetricCategory(id, data);

    console.log(chalk.green('Metric category updated successfully'));
    printFormatted(category, globalOptions);
  }));

const archiveCommand = new Command('archive')
  .description('Archive a metric category')
  .argument('<id>', 'category ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveMetricCategory(id, true);
    console.log(chalk.green('Metric category archived successfully'));
  }));

metricCategoriesCommand.addCommand(listCommand);
metricCategoriesCommand.addCommand(getCommand);
metricCategoriesCommand.addCommand(createCommand);
metricCategoriesCommand.addCommand(updateCommand);
metricCategoriesCommand.addCommand(archiveCommand);
