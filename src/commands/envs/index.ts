import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseEnvironmentId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { EnvironmentId } from '../../lib/api/branded-types.js';

export const envsCommand = new Command('envs')
  .alias('env')
  .alias('environment')
  .description('Environment commands');

const listCommand = createListCommand({
  description: 'List all environments',
  defaultItems: 100,
  fetch: (client, options) => client.listEnvironments(options.items as number, options.page as number),
});

const getCommand = new Command('get')
  .description('Get environment details')
  .argument('<id>', 'environment ID', parseEnvironmentId)
  .action(withErrorHandling(async (id: EnvironmentId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const env = await client.getEnvironment(id);
    printFormatted(env, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new environment')
  .requiredOption('--name <name>', 'environment name')
  .action(withErrorHandling(async (options: { name: string }) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const env = await client.createEnvironment({ name: options.name });
    console.log(chalk.green(`✓ Environment created with ID: ${env.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update an environment')
  .argument('<id>', 'environment ID', parseEnvironmentId)
  .option('--name <name>', 'new name')
  .action(withErrorHandling(async (id: EnvironmentId, options: { name?: string }) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const data: Record<string, unknown> = {};
    if (options.name !== undefined) data.name = options.name;
    requireAtLeastOneField(data, 'update field');
    await client.updateEnvironment(id, data);
    console.log(chalk.green(`✓ Environment ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive an environment')
  .argument('<id>', 'environment ID', parseEnvironmentId)
  .option('--unarchive', 'unarchive the environment')
  .action(withErrorHandling(async (id: EnvironmentId, options: { unarchive?: boolean }) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.archiveEnvironment(id, options.unarchive);
    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Environment ${id} ${action}`));
  }));

envsCommand.addCommand(listCommand);
envsCommand.addCommand(getCommand);
envsCommand.addCommand(createCommand);
envsCommand.addCommand(updateCommand);
envsCommand.addCommand(archiveCommand);
