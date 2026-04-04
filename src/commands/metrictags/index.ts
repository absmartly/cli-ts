import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseTagId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { getMetricTag, createMetricTag, updateMetricTag, deleteMetricTag } from '../../core/metrictags/index.js';

export const metricTagsCommand = new Command('metric-tags')
  .alias('metrictags')
  .alias('metrictag')
  .alias('metric-tag')
  .description('Metric tag commands');

const listCommand = createListCommand({
  description: 'List all metric tags',
  fetch: (client, options) => client.listMetricTags(options.items as number, options.page as number),
});

const getCommand = new Command('get')
  .description('Get metric tag details')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await getMetricTag(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new metric tag')
  .requiredOption('--tag <name>', 'tag value')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await createMetricTag(client, { tag: options.tag });
    console.log(chalk.green('Metric tag created successfully'));
    printFormatted(result.data, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a metric tag')
  .argument('<id>', 'tag ID', parseTagId)
  .option('--tag <name>', 'new tag value')
  .action(withErrorHandling(async (id: TagId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await updateMetricTag(client, { id, tag: options.tag });
    console.log(chalk.green('Metric tag updated successfully'));
    printFormatted(result.data, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete a metric tag')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await deleteMetricTag(client, { id });
    console.log(chalk.green('Metric tag deleted successfully'));
  }));

metricTagsCommand.addCommand(listCommand);
metricTagsCommand.addCommand(getCommand);
metricTagsCommand.addCommand(createCommand);
metricTagsCommand.addCommand(updateCommand);
metricTagsCommand.addCommand(deleteCommand);
