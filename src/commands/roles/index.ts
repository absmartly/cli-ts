import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const rolesCommand = new Command('roles').alias('role').description('Role commands');

const listCommand = new Command('list')
  .description('List all roles')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const roles = await client.listRoles(options.limit, options.offset);
    printFormatted(roles, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get role details')
  .argument('<id>', 'role ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const role = await client.getRole(id);
    printFormatted(role, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new role')
  .requiredOption('--name <name>', 'role name')
  .option('--description <text>', 'role description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const role = await client.createRole({
      name: options.name,
      description: options.description,
    });

    console.log(chalk.green(`✓ Role created with ID: ${role.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a role')
  .argument('<id>', 'role ID', parseInt)
  .option('--name <name>', 'new name')
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.name) data.name = options.name;
    if (options.description) data.description = options.description;

    await client.updateRole(id, data);
    console.log(chalk.green(`✓ Role ${id} updated`));
  }));

const deleteCommand = new Command('delete')
  .description('Delete a role')
  .argument('<id>', 'role ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteRole(id);
    console.log(chalk.green(`✓ Role ${id} deleted`));
  }));

rolesCommand.addCommand(listCommand);
rolesCommand.addCommand(getCommand);
rolesCommand.addCommand(createCommand);
rolesCommand.addCommand(updateCommand);
rolesCommand.addCommand(deleteCommand);
