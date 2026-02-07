import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseUserId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { UserId } from '../../lib/api/branded-types.js';

export const usersCommand = new Command('users').alias('user').description('User commands');

const listCommand = new Command('list')
  .description('List all users')
  .option('--include-archived', 'include archived users')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const users = await client.listUsers(options.includeArchived);
    printFormatted(users, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get user details')
  .argument('<id>', 'user ID', parseUserId)
  .action(withErrorHandling(async (id: UserId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const user = await client.getUser(id);
    printFormatted(user, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new user')
  .requiredOption('--email <email>', 'user email')
  .requiredOption('--name <name>', 'user full name')
  .option('--role <role>', 'user role')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const [firstName, ...lastNameParts] = options.name.split(' ');
    const user = await client.createUser({
      email: options.email,
      first_name: firstName,
      last_name: lastNameParts.join(' '),
    });

    console.log(chalk.green(`✓ User created with ID: ${user.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a user')
  .argument('<id>', 'user ID', parseUserId)
  .option('--name <name>', 'new full name')
  .option('--role <role>', 'new role')
  .action(withErrorHandling(async (id: UserId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.name) {
      const [firstName, ...lastNameParts] = options.name.split(' ');
      data.first_name = firstName;
      data.last_name = lastNameParts.join(' ');
    }

    requireAtLeastOneField(data, 'update field');
    await client.updateUser(id, data);
    console.log(chalk.green(`✓ User ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a user')
  .argument('<id>', 'user ID', parseUserId)
  .option('--unarchive', 'unarchive the user')
  .action(withErrorHandling(async (id: UserId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveUser(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ User ${id} ${action}`));
  }));

usersCommand.addCommand(listCommand);
usersCommand.addCommand(getCommand);
usersCommand.addCommand(createCommand);
usersCommand.addCommand(updateCommand);
usersCommand.addCommand(archiveCommand);
