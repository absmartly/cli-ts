import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const tagsCommand = new Command('tags')
  .alias('tag')
  .alias('experiment-tags')
  .description('Experiment tag commands');

const listCommand = new Command('list')
  .description('List all experiment tags')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const tags = await client.listExperimentTags(options.limit, options.offset);

      const output = formatOutput(tags, globalOptions.output as any, {
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
  .description('Get experiment tag details')
  .argument('<id>', 'tag ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const tag = await client.getExperimentTag(id);

      const output = formatOutput(tag, globalOptions.output as any, {
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
  .description('Create a new experiment tag')
  .requiredOption('--tag <name>', 'tag name')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data = {
        tag: options.tag,
      };

      const tag = await client.createExperimentTag(data);

      console.log(chalk.green('Experiment tag created successfully'));
      const output = formatOutput(tag, globalOptions.output as any, {
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
  .description('Update an experiment tag')
  .argument('<id>', 'tag ID', parseInt)
  .option('--tag <name>', 'new tag name')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: { tag?: string } = {};
      if (options.tag) data.tag = options.tag;

      const tag = await client.updateExperimentTag(id, data as { tag: string });

      console.log(chalk.green('Experiment tag updated successfully'));
      const output = formatOutput(tag, globalOptions.output as any, {
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

const deleteCommand = new Command('delete')
  .description('Delete an experiment tag')
  .argument('<id>', 'tag ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteExperimentTag(id);

      console.log(chalk.green('Experiment tag deleted successfully'));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

tagsCommand.addCommand(listCommand);
tagsCommand.addCommand(getCommand);
tagsCommand.addCommand(createCommand);
tagsCommand.addCommand(updateCommand);
tagsCommand.addCommand(deleteCommand);
