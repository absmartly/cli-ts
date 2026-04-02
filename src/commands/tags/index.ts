import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseTagId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { getTag } from '../../core/tags/get.js';
import { createTag } from '../../core/tags/create.js';
import { updateTag } from '../../core/tags/update.js';
import { deleteTag } from '../../core/tags/delete.js';

export const tagsCommand = new Command('tags')
  .alias('tag')
  .alias('experiment-tags')
  .description('Experiment tag commands');

const listCommand = createListCommand({
  description: 'List all experiment tags',
  fetch: (client, options) => client.listExperimentTags(options.items as number, options.page as number),
});

const getCommand = new Command('get')
  .description('Get experiment tag details')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await getTag(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new experiment tag')
  .requiredOption('--tag <name>', 'tag name')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await createTag(client, { tag: options.tag });
    console.log(chalk.green('Experiment tag created successfully'));
    printFormatted(result.data, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update an experiment tag')
  .argument('<id>', 'tag ID', parseTagId)
  .option('--tag <name>', 'new tag name')
  .action(withErrorHandling(async (id: TagId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await updateTag(client, { id, tag: options.tag });
    console.log(chalk.green('Experiment tag updated successfully'));
    printFormatted(result.data, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete an experiment tag')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await deleteTag(client, { id });
    console.log(chalk.green('Experiment tag deleted successfully'));
  }));

tagsCommand.addCommand(listCommand);
tagsCommand.addCommand(getCommand);
tagsCommand.addCommand(createCommand);
tagsCommand.addCommand(updateCommand);
tagsCommand.addCommand(deleteCommand);
