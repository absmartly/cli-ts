import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseTagId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import { summarizeTagRow } from '../../api-client/entity-summary.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { getTag, createTag, updateTag, deleteTag } from '../../core/tags/index.js';

export const tagsCommand = new Command('tags')
  .alias('tag')
  .alias('experiment-tags')
  .description('Experiment tag commands');

const listCommand = createListCommand({
  description: 'List all experiment tags',
  fetch: (client, options) =>
    client.listExperimentTags({
      items: options.items as number,
      page: options.page as number,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sort_asc: options.asc ? true : options.desc ? false : undefined,
      archived: options.archived as boolean,
      ids: options.ids as string | undefined,
    }),
  summarizeRow: summarizeTagRow,
});

const getCommand = new Command('get')
  .description('Get experiment tag details')
  .argument('<id>', 'tag ID', parseTagId)
  .action(
    withErrorHandling(async (id: TagId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getTag(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new experiment tag')
  .requiredOption('--tag <name>', 'tag name')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createTag(client, { tag: options.tag });
      const data = result.data as { id?: unknown } | undefined;
      printResult(globalOptions, {
        message: 'Experiment tag created successfully',
        id: data?.id,
        raw: result.data,
      });
    })
  );

const updateCommand = new Command('update')
  .description('Update an experiment tag')
  .argument('<id>', 'tag ID', parseTagId)
  .option('--tag <name>', 'new tag name')
  .action(
    withErrorHandling(async (id: TagId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await updateTag(client, { id, tag: options.tag });
      printResult(globalOptions, {
        message: 'Experiment tag updated successfully',
        id,
        raw: result.data,
      });
    })
  );

const deleteCommand = new Command('delete')
  .description('Delete an experiment tag')
  .argument('<id>', 'tag ID', parseTagId)
  .action(
    withErrorHandling(async (id: TagId) => {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await deleteTag(client, { id });
      printResult(globalOptions, { message: 'Experiment tag deleted successfully', id });
    })
  );

tagsCommand.addCommand(listCommand);
tagsCommand.addCommand(getCommand);
tagsCommand.addCommand(createCommand);
tagsCommand.addCommand(updateCommand);
tagsCommand.addCommand(deleteCommand);
