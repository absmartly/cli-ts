import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

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
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const categories = await client.listMetricCategories(options.limit, options.offset);

      const output = formatOutput(categories, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const getCommand = new Command('get')
  .description('Get metric category details')
  .argument('<id>', 'category ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const category = await client.getMetricCategory(id);

      const output = formatOutput(category, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const createCommand = new Command('create')
  .description('Create a new metric category')
  .requiredOption('--name <name>', 'category name')
  .option('--description <text>', 'category description')
  .requiredOption('--color <color>', 'category color (e.g., #FF5733)')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data = {
        name: options.name,
        description: options.description,
        color: options.color,
      };

      const category = await client.createMetricCategory(data);

      console.log(chalk.green('Metric category created successfully'));
      const output = formatOutput(category, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });
      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const updateCommand = new Command('update')
  .description('Update a metric category')
  .argument('<id>', 'category ID', parseInt)
  .option('--name <name>', 'new category name')
  .option('--description <text>', 'new category description')
  .option('--color <color>', 'new category color')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: { name?: string; description?: string; color?: string } = {};
      if (options.name) data.name = options.name;
      if (options.description) data.description = options.description;
      if (options.color) data.color = options.color;

      const category = await client.updateMetricCategory(id, data);

      console.log(chalk.green('Metric category updated successfully'));
      const output = formatOutput(category, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });
      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const archiveCommand = new Command('archive')
  .description('Archive a metric category')
  .argument('<id>', 'category ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.archiveMetricCategory(id, true);

      console.log(chalk.green('Metric category archived successfully'));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

metricCategoriesCommand.addCommand(listCommand);
metricCategoriesCommand.addCommand(getCommand);
metricCategoriesCommand.addCommand(createCommand);
metricCategoriesCommand.addCommand(updateCommand);
metricCategoriesCommand.addCommand(archiveCommand);
