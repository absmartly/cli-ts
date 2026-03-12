import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseApplicationId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { ApplicationId } from '../../lib/api/branded-types.js';

export const appsCommand = new Command('apps')
  .alias('app')
  .alias('application')
  .description('Application commands');

const listCommand = new Command('list')
  .description('List all applications')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const apps = await client.listApplications();
    printFormatted(apps, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get application details')
  .argument('<id>', 'application ID', parseApplicationId)
  .action(withErrorHandling(async (id: ApplicationId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const app = await client.getApplication(id);
    printFormatted(app, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new application')
  .requiredOption('--name <name>', 'application name')
  .action(withErrorHandling(async (options: { name: string }) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const app = await client.createApplication({ name: options.name });
    console.log(chalk.green(`✓ Application created with ID: ${app.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update an application')
  .argument('<id>', 'application ID', parseApplicationId)
  .option('--name <name>', 'new name')
  .action(withErrorHandling(async (id: ApplicationId, options: { name?: string }) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const data: Record<string, unknown> = {};
    if (options.name !== undefined) data.name = options.name;
    requireAtLeastOneField(data, 'update field');
    await client.updateApplication(id, data);
    console.log(chalk.green(`✓ Application ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive an application')
  .argument('<id>', 'application ID', parseApplicationId)
  .option('--unarchive', 'unarchive the application')
  .action(withErrorHandling(async (id: ApplicationId, options: { unarchive?: boolean }) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.archiveApplication(id, options.unarchive);
    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Application ${id} ${action}`));
  }));

appsCommand.addCommand(listCommand);
appsCommand.addCommand(getCommand);
appsCommand.addCommand(createCommand);
appsCommand.addCommand(updateCommand);
appsCommand.addCommand(archiveCommand);
