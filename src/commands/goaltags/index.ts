import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseTagId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { TagId } from '../../lib/api/branded-types.js';

export const goalTagsCommand = new Command('goal-tags')
  .alias('goaltags')
  .alias('goaltag')
  .alias('goal-tag')
  .description('Goal tag commands');

const listCommand = new Command('list')
  .description('List all goal tags')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tags = await client.listGoalTags(options.limit, options.offset);
    printFormatted(tags, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get goal tag details')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tag = await client.getGoalTag(id);
    printFormatted(tag, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new goal tag')
  .requiredOption('--tag <name>', 'tag value')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tag = await client.createGoalTag({ tag: options.tag });

    console.log(chalk.green('Goal tag created successfully'));
    printFormatted(tag, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a goal tag')
  .argument('<id>', 'tag ID', parseTagId)
  .option('--tag <name>', 'new tag value')
  .action(withErrorHandling(async (id: TagId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: { tag?: string } = {};
    if (options.tag) data.tag = options.tag;

    requireAtLeastOneField(data, 'update field');
    const tag = await client.updateGoalTag(id, data as { tag: string });

    console.log(chalk.green('Goal tag updated successfully'));
    printFormatted(tag, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete a goal tag')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteGoalTag(id);
    console.log(chalk.green('Goal tag deleted successfully'));
  }));

goalTagsCommand.addCommand(listCommand);
goalTagsCommand.addCommand(getCommand);
goalTagsCommand.addCommand(createCommand);
goalTagsCommand.addCommand(updateCommand);
goalTagsCommand.addCommand(deleteCommand);
