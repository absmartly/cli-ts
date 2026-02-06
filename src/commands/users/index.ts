import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const usersCommand = new Command('users').alias('user').description('User commands');

const listCommand = new Command('list')
  .description('List all users')
  .option('--include-archived', 'include archived users')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const users = await client.listUsers(options.includeArchived);

      const output = formatOutput(users, globalOptions.output as any, {
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
  .description('Get user details')
  .argument('<id>', 'user ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const user = await client.getUser(id);

      const output = formatOutput(user, globalOptions.output as any, {
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
  .description('Create a new user')
  .requiredOption('--email <email>', 'user email')
  .requiredOption('--name <name>', 'user full name')
  .option('--role <role>', 'user role')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const [firstName, ...lastNameParts] = options.name.split(' ');
      const data = {
        email: options.email,
        first_name: firstName,
        last_name: lastNameParts.join(' '),
      };

      const user = await client.createUser(data);

      console.log(chalk.green(`✓ User created with ID: ${user.id}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const updateCommand = new Command('update')
  .description('Update a user')
  .argument('<id>', 'user ID', parseInt)
  .option('--name <name>', 'new full name')
  .option('--role <role>', 'new role')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: Record<string, string> = {};
      if (options.name) {
        const [firstName, ...lastNameParts] = options.name.split(' ');
        data.first_name = firstName;
        data.last_name = lastNameParts.join(' ');
      }

      await client.updateUser(id, data);

      console.log(chalk.green(`✓ User ${id} updated`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a user')
  .argument('<id>', 'user ID', parseInt)
  .option('--unarchive', 'unarchive the user')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.archiveUser(id, options.unarchive);

      const action = options.unarchive ? 'unarchived' : 'archived';
      console.log(chalk.green(`✓ User ${id} ${action}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

usersCommand.addCommand(listCommand);
usersCommand.addCommand(getCommand);
usersCommand.addCommand(createCommand);
usersCommand.addCommand(updateCommand);
usersCommand.addCommand(archiveCommand);
