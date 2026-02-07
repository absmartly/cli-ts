import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseTagId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { TagId } from '../../lib/api/branded-types.js';

export const metricTagsCommand = new Command('metric-tags')
  .alias('metrictags')
  .alias('metrictag')
  .alias('metric-tag')
  .description('Metric tag commands');

const listCommand = new Command('list')
  .description('List all metric tags')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tags = await client.listMetricTags(options.limit, options.offset);
    printFormatted(tags, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get metric tag details')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tag = await client.getMetricTag(id);
    printFormatted(tag, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new metric tag')
  .requiredOption('--tag <name>', 'tag value')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const tag = await client.createMetricTag({ tag: options.tag });

    console.log(chalk.green('Metric tag created successfully'));
    printFormatted(tag, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a metric tag')
  .argument('<id>', 'tag ID', parseTagId)
  .option('--tag <name>', 'new tag value')
  .action(withErrorHandling(async (id: TagId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: { tag?: string } = {};
    if (options.tag) data.tag = options.tag;

    requireAtLeastOneField(data, 'update field');
    const tag = await client.updateMetricTag(id, data as { tag: string });

    console.log(chalk.green('Metric tag updated successfully'));
    printFormatted(tag, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete a metric tag')
  .argument('<id>', 'tag ID', parseTagId)
  .action(withErrorHandling(async (id: TagId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteMetricTag(id);
    console.log(chalk.green('Metric tag deleted successfully'));
  }));

metricTagsCommand.addCommand(listCommand);
metricTagsCommand.addCommand(getCommand);
metricTagsCommand.addCommand(createCommand);
metricTagsCommand.addCommand(updateCommand);
metricTagsCommand.addCommand(deleteCommand);
