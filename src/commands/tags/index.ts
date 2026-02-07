import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId, requireAtLeastOneField } from '../../lib/utils/validators.js';

export const tagsCommand = new Command('tags')
  .alias('tag')
  .alias('experiment-tags')
  .description('Experiment tag commands');

const listCommand = new Command('list')
  .description('List all experiment tags')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tags = await client.listExperimentTags(options.limit, options.offset);
    printFormatted(tags, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get experiment tag details')
  .argument('<id>', 'tag ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tag = await client.getExperimentTag(id);
    printFormatted(tag, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new experiment tag')
  .requiredOption('--tag <name>', 'tag name')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tag = await client.createExperimentTag({ tag: options.tag });

    console.log(chalk.green('Experiment tag created successfully'));
    printFormatted(tag, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update an experiment tag')
  .argument('<id>', 'tag ID', parseId)
  .option('--tag <name>', 'new tag name')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: { tag?: string } = {};
    if (options.tag) data.tag = options.tag;

    requireAtLeastOneField(data, 'update field');
    const tag = await client.updateExperimentTag(id, data as { tag: string });

    console.log(chalk.green('Experiment tag updated successfully'));
    printFormatted(tag, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete an experiment tag')
  .argument('<id>', 'tag ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteExperimentTag(id);
    console.log(chalk.green('Experiment tag deleted successfully'));
  }));

tagsCommand.addCommand(listCommand);
tagsCommand.addCommand(getCommand);
tagsCommand.addCommand(createCommand);
tagsCommand.addCommand(updateCommand);
tagsCommand.addCommand(deleteCommand);
