import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const rolesCommand = new Command('roles').alias('role').description('Role commands');

const listCommand = new Command('list')
  .description('List all roles')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const roles = await client.listRoles(options.limit, options.offset);

      const output = formatOutput(roles, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const getCommand = new Command('get')
  .description('Get role details')
  .argument('<id>', 'role ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const role = await client.getRole(id);

      const output = formatOutput(role, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const createCommand = new Command('create')
  .description('Create a new role')
  .requiredOption('--name <name>', 'role name')
  .option('--description <text>', 'role description')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data = {
        name: options.name,
        description: options.description,
      };

      const role = await client.createRole(data);

      console.log(chalk.green(`✓ Role created with ID: ${role.id}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const updateCommand = new Command('update')
  .description('Update a role')
  .argument('<id>', 'role ID', parseInt)
  .option('--name <name>', 'new name')
  .option('--description <text>', 'new description')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: Record<string, string> = {};
      if (options.name) data.name = options.name;
      if (options.description) data.description = options.description;

      await client.updateRole(id, data);

      console.log(chalk.green(`✓ Role ${id} updated`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const deleteCommand = new Command('delete')
  .description('Delete a role')
  .argument('<id>', 'role ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteRole(id);

      console.log(chalk.green(`✓ Role ${id} deleted`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

rolesCommand.addCommand(listCommand);
rolesCommand.addCommand(getCommand);
rolesCommand.addCommand(createCommand);
rolesCommand.addCommand(updateCommand);
rolesCommand.addCommand(deleteCommand);
