import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseSegmentId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { applyShowExclude, summarizeSegment, summarizeSegmentRow } from '../../api-client/entity-summary.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { SegmentId } from '../../lib/api/branded-types.js';

export const segmentsCommand = new Command('segments')
  .alias('segment')
  .description('Segment commands');

const listCommand = createListCommand({
  description: 'List all segments',
  defaultItems: 100,
  fetch: (client, options) => client.listSegments(options.items as number, options.page as number),
  summarizeRow: summarizeSegmentRow,
});

const getCommand = new Command('get')
  .description('Get segment details')
  .argument('<id>', 'segment ID', parseSegmentId)
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(withErrorHandling(async (id: SegmentId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const segment = await client.getSegment(id);
    const data = options.raw ? segment : applyShowExclude(summarizeSegment(segment as Record<string, unknown>), segment as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new segment')
  .argument('<name>', 'segment name')
  .requiredOption('--attribute <attr>', 'value source attribute name')
  .option('--description <text>', 'segment description')
  .action(withErrorHandling(async (name: string, options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const segment = await client.createSegment({
      name,
      value_source_attribute: options.attribute,
      description: options.description,
    });

    console.log(chalk.green(`✓ Segment created with ID: ${segment.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a segment')
  .argument('<id>', 'segment ID', parseSegmentId)
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: SegmentId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.displayName !== undefined) data.display_name = options.displayName;
    if (options.description !== undefined) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateSegment(id, data);
    console.log(chalk.green(`✓ Segment ${id} updated`));
  }));

const deleteCommand = new Command('delete')
  .description('Delete a segment')
  .argument('<id>', 'segment ID', parseSegmentId)
  .action(withErrorHandling(async (id: SegmentId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteSegment(id);
    console.log(chalk.green(`✓ Segment ${id} deleted`));
  }));

segmentsCommand.addCommand(listCommand);
segmentsCommand.addCommand(getCommand);
segmentsCommand.addCommand(createCommand);
segmentsCommand.addCommand(updateCommand);
segmentsCommand.addCommand(deleteCommand);
