import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const goalTagsCommand = new Command('goal-tags')
  .alias('goaltags')
  .alias('goaltag')
  .alias('goal-tag')
  .description('Goal tag commands');

const listCommand = new Command('list')
  .description('List all goal tags')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const tags = await client.listGoalTags(options.limit, options.offset);

      const output = formatOutput(tags, globalOptions.output, {
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
  .description('Get goal tag details')
  .argument('<id>', 'tag ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const tag = await client.getGoalTag(id);

      const output = formatOutput(tag, globalOptions.output, {
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
  .description('Create a new goal tag')
  .requiredOption('--tag <name>', 'tag value')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data = {
        tag: options.tag,
      };

      const tag = await client.createGoalTag(data);

      console.log(chalk.green('Goal tag created successfully'));
      const output = formatOutput(tag, globalOptions.output, {
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
  .description('Update a goal tag')
  .argument('<id>', 'tag ID', parseInt)
  .option('--tag <name>', 'new tag value')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: { tag?: string } = {};
      if (options.tag) data.tag = options.tag;

      const tag = await client.updateGoalTag(id, data as { tag: string });

      console.log(chalk.green('Goal tag updated successfully'));
      const output = formatOutput(tag, globalOptions.output, {
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
  .description('Delete a goal tag')
  .argument('<id>', 'tag ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteGoalTag(id);

      console.log(chalk.green('Goal tag deleted successfully'));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

goalTagsCommand.addCommand(listCommand);
goalTagsCommand.addCommand(getCommand);
goalTagsCommand.addCommand(createCommand);
goalTagsCommand.addCommand(updateCommand);
goalTagsCommand.addCommand(deleteCommand);
