import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseSegmentId } from '../../lib/utils/validators.js';
import { summarizeSegmentRow } from '../../api-client/entity-summary.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { SegmentId } from '../../lib/api/branded-types.js';
import {
  getSegment,
  createSegment,
  updateSegment,
  deleteSegment,
} from '../../core/segments/index.js';

export const segmentsCommand = new Command('segments')
  .alias('segment')
  .description('Segment commands');

const listCommand = createListCommand({
  description: 'List all segments',
  defaultItems: 100,
  fetch: (client, options) =>
    client.listSegments({
      items: options.items as number,
      page: options.page as number,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sort_asc: options.asc ? true : options.desc ? false : undefined,
      archived: options.archived as boolean,
      ids: options.ids as string | undefined,
    }),
  summarizeRow: summarizeSegmentRow,
});

const getCommand = new Command('get')
  .description('Get segment details')
  .argument('<id>', 'segment ID', parseSegmentId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .option(
    '--show-only <fields...>',
    'show only these fields (mutually exclusive with --show and --exclude)'
  )
  .action(
    withErrorHandling(async (id: SegmentId, options) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const show = (options.show as string[] | undefined) ?? [];
      const exclude = (options.exclude as string[] | undefined) ?? [];
      const showOnly = options.showOnly as string[] | undefined;
      if (showOnly && (show.length > 0 || exclude.length > 0)) {
        throw new Error('--show-only is mutually exclusive with --show and --exclude');
      }
      const result = await getSegment(client, {
        id,
        show,
        exclude,
        showOnly,
        raw: globalOptions.raw,
      });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new segment')
  .argument('<name>', 'segment name')
  .requiredOption('--attribute <attr>', 'value source attribute name')
  .option('--description <text>', 'segment description')
  .action(
    withErrorHandling(async (name: string, options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createSegment(client, {
        name,
        attribute: options.attribute,
        description: options.description,
      });
      const newId = (result.data as Record<string, unknown>).id;
      printResult(globalOptions, {
        message: `✓ Segment created with ID: ${newId}`,
        id: newId,
        raw: result.data,
      });
    })
  );

const updateCommand = new Command('update')
  .description('Update a segment')
  .argument('<id>', 'segment ID', parseSegmentId)
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .action(
    withErrorHandling(async (id: SegmentId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await updateSegment(client, {
        id,
        displayName: options.displayName,
        description: options.description,
      });
      printResult(globalOptions, { message: `✓ Segment ${id} updated`, id });
    })
  );

const deleteCommand = new Command('delete')
  .description('Delete a segment')
  .argument('<id>', 'segment ID', parseSegmentId)
  .action(
    withErrorHandling(async (id: SegmentId) => {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await deleteSegment(client, { id });
      printResult(globalOptions, { message: `✓ Segment ${id} deleted`, id });
    })
  );

segmentsCommand.addCommand(listCommand);
segmentsCommand.addCommand(getCommand);
segmentsCommand.addCommand(createCommand);
segmentsCommand.addCommand(updateCommand);
segmentsCommand.addCommand(deleteCommand);
