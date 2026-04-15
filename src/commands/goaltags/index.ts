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
  getGoalTag,
  createGoalTag,
  updateGoalTag,
  deleteGoalTag,
} from '../../core/goaltags/index.js';

export const goalTagsCommand = new Command('goal-tags')
  .alias('goaltags')
  .alias('goaltag')
  .alias('goal-tag')
  .description('Goal tag commands');

const listCommand = createListCommand({
  description: 'List all goal tags',
  fetch: (client, options) =>
    client.listGoalTags({
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
  .description('Get goal tag details')
  .argument('<id>', 'tag ID', parseTagId)
  .action(
    withErrorHandling(async (id: TagId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getGoalTag(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new goal tag')
  .requiredOption('--tag <name>', 'tag value')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createGoalTag(client, { tag: options.tag });
      console.log(chalk.green('Goal tag created successfully'));
      printFormatted(result.data, globalOptions);
    })
  );

const updateCommand = new Command('update')
  .description('Update a goal tag')
  .argument('<id>', 'tag ID', parseTagId)
  .option('--tag <name>', 'new tag value')
  .action(
    withErrorHandling(async (id: TagId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await updateGoalTag(client, { id, tag: options.tag });
      console.log(chalk.green('Goal tag updated successfully'));
      printFormatted(result.data, globalOptions);
    })
  );

const deleteCommand = new Command('delete')
  .description('Delete a goal tag')
  .argument('<id>', 'tag ID', parseTagId)
  .action(
    withErrorHandling(async (id: TagId) => {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await deleteGoalTag(client, { id });
      console.log(chalk.green('Goal tag deleted successfully'));
    })
  );

goalTagsCommand.addCommand(listCommand);
goalTagsCommand.addCommand(getCommand);
goalTagsCommand.addCommand(createCommand);
goalTagsCommand.addCommand(updateCommand);
goalTagsCommand.addCommand(deleteCommand);
