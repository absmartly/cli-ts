import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseApplicationId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { ApplicationId } from '../../lib/api/branded-types.js';
import { getApp, createApp, updateApp, archiveApp } from '../../core/apps/index.js';

export const appsCommand = new Command('apps')
  .alias('app')
  .alias('application')
  .description('Application commands');

const listCommand = createListCommand({
  description: 'List all applications',
  defaultItems: 100,
  fetch: (client, options) =>
    client.listApplications(options.items as number, options.page as number),
  summarizeRow: (item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    archived: item.archived,
    created_at: item.created_at,
    created_by:
      item.created_by && typeof item.created_by === 'object'
        ? [
            (item.created_by as Record<string, unknown>).first_name ?? '',
            (item.created_by as Record<string, unknown>).last_name ?? '',
          ]
            .filter(Boolean)
            .join(' ')
        : item.created_by,
  }),
});

const getCommand = new Command('get')
  .description('Get application details')
  .argument('<id>', 'application ID', parseApplicationId)
  .action(
    withErrorHandling(async (id: ApplicationId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getApp(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new application')
  .requiredOption('--name <name>', 'application name')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createApp(client, { name: options.name });
      console.log(
        chalk.green(`✓ Application created with ID: ${(result.data as Record<string, unknown>).id}`)
      );
    })
  );

const updateCommand = new Command('update')
  .description('Update an application')
  .argument('<id>', 'application ID', parseApplicationId)
  .option('--name <name>', 'new name')
  .action(
    withErrorHandling(async (id: ApplicationId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await updateApp(client, { id, name: options.name });
      console.log(chalk.green(`✓ Application ${id} updated`));
    })
  );

const archiveCommand = new Command('archive')
  .description('Archive or unarchive an application')
  .argument('<id>', 'application ID', parseApplicationId)
  .option('--unarchive', 'unarchive the application')
  .action(
    withErrorHandling(async (id: ApplicationId, options) => {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await archiveApp(client, { id, unarchive: options.unarchive });
      const action = options.unarchive ? 'unarchived' : 'archived';
      console.log(chalk.green(`✓ Application ${id} ${action}`));
    })
  );

appsCommand.addCommand(listCommand);
appsCommand.addCommand(getCommand);
appsCommand.addCommand(createCommand);
appsCommand.addCommand(updateCommand);
appsCommand.addCommand(archiveCommand);
