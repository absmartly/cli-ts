import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseEnvironmentId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import { summarizeNamedEntityRow } from '../../api-client/entity-summary.js';
import type { EnvironmentId } from '../../lib/api/branded-types.js';
import { getEnv, createEnv, updateEnv, archiveEnv } from '../../core/envs/index.js';

export const envsCommand = new Command('envs')
  .alias('env')
  .alias('environment')
  .description('Environment commands');

const listCommand = createListCommand({
  description: 'List all environments',
  defaultItems: 100,
  fetch: (client, options) =>
    client.listEnvironments({
      items: options.items as number,
      page: options.page as number,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sort_asc: options.asc ? true : options.desc ? false : undefined,
      archived: options.archived as boolean,
      ids: options.ids as string | undefined,
    }),
  summarizeRow: summarizeNamedEntityRow,
});

const getCommand = new Command('get')
  .description('Get environment details')
  .argument('<id>', 'environment ID', parseEnvironmentId)
  .action(
    withErrorHandling(async (id: EnvironmentId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getEnv(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new environment')
  .requiredOption('--name <name>', 'environment name')
  .action(
    withErrorHandling(async (options: { name: string }) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createEnv(client, { name: options.name });
      const newId = (result.data as Record<string, unknown>).id;
      printResult(globalOptions, {
        message: `✓ Environment created with ID: ${newId}`,
        id: newId,
        raw: result.data,
      });
    })
  );

const updateCommand = new Command('update')
  .description('Update an environment')
  .argument('<id>', 'environment ID', parseEnvironmentId)
  .option('--name <name>', 'new name')
  .action(
    withErrorHandling(async (id: EnvironmentId, options: { name?: string }) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await updateEnv(client, { id, name: options.name });
      printResult(globalOptions, { message: `✓ Environment ${id} updated`, id });
    })
  );

const archiveCommand = new Command('archive')
  .description('Archive or unarchive an environment')
  .argument('<id>', 'environment ID', parseEnvironmentId)
  .option('--unarchive', 'unarchive the environment')
  .action(
    withErrorHandling(async (id: EnvironmentId, options: { unarchive?: boolean }) => {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await archiveEnv(client, { id, unarchive: options.unarchive });
      const action = options.unarchive ? 'unarchived' : 'archived';
      printResult(globalOptions, { message: `✓ Environment ${id} ${action}`, id });
    })
  );

envsCommand.addCommand(listCommand);
envsCommand.addCommand(getCommand);
envsCommand.addCommand(createCommand);
envsCommand.addCommand(updateCommand);
envsCommand.addCommand(archiveCommand);
