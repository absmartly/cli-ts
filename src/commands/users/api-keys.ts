import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';
import { addPaginationOptions, printPaginationFooter } from '../../lib/utils/pagination.js';
import { UserId } from '../../api-client/types.js';
import type { APIClient } from '../../api-client/api-client.js';

async function resolveUserId(client: APIClient, userRef: string): Promise<UserId> {
  const asInt = parseInt(userRef, 10);
  if (!isNaN(asInt) && String(asInt) === userRef.trim()) return UserId(asInt);
  const resolved = await client.resolveUsers([userRef]);
  return UserId(resolved[0]!.id);
}

export const userApiKeysCommand = new Command('api-keys')
  .alias('api-key')
  .description('Manage API keys for a user');

const listCommand = addPaginationOptions(
  new Command('list')
    .description('List API keys for a user')
    .requiredOption('--user <value>', 'user ID, name, or email'),
).action(withErrorHandling(async (options) => {
  const globalOptions = getGlobalOptions(listCommand);
  const client = await getAPIClientFromOptions(globalOptions);
  const userId = await resolveUserId(client, options.user as string);
  const keys = await client.listUserApiKeysByUserId(userId, options.items, options.page);
  printFormatted(keys, globalOptions);
  printPaginationFooter(keys.length, options.items, options.page, globalOptions.output as string);
}));

const getCommand = new Command('get')
  .description('Get an API key for a user')
  .argument('<id>', 'API key ID', parseInt)
  .requiredOption('--user <value>', 'user ID, name, or email')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const userId = await resolveUserId(client, options.user as string);
    const key = await client.getUserApiKeyByUserId(userId, id);
    printFormatted(key, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create an API key for a user')
  .requiredOption('--user <value>', 'user ID, name, or email')
  .requiredOption('--name <name>', 'API key name')
  .option('--description <text>', 'API key description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const userId = await resolveUserId(client, options.user as string);
    const apiKey = await client.createUserApiKeyByUserId(userId, {
      name: options.name,
      description: options.description,
    });
    console.log(chalk.green(`✓ API key created: ${apiKey.name}`));
    console.log(`  Key: ${apiKey.key}`);
    console.log(chalk.yellow('  Save this key now — it cannot be retrieved later.'));
  }));

const updateCommand = new Command('update')
  .description('Update an API key for a user')
  .argument('<id>', 'API key ID', parseInt)
  .requiredOption('--user <value>', 'user ID, name, or email')
  .option('--name <name>', 'new name')
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const userId = await resolveUserId(client, options.user as string);
    const data: Record<string, string> = {};
    if (options.name !== undefined) data.name = options.name;
    if (options.description !== undefined) data.description = options.description;
    requireAtLeastOneField(data, 'update field');
    await client.updateUserApiKeyByUserId(userId, id, data);
    console.log(chalk.green(`✓ API key ${id} updated`));
  }));

const deleteCommand = new Command('delete')
  .description('Delete an API key for a user')
  .argument('<id>', 'API key ID', parseInt)
  .requiredOption('--user <value>', 'user ID, name, or email')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const userId = await resolveUserId(client, options.user as string);
    await client.deleteUserApiKeyByUserId(userId, id);
    console.log(chalk.green(`✓ API key ${id} deleted`));
  }));

userApiKeysCommand.addCommand(listCommand);
userApiKeysCommand.addCommand(getCommand);
userApiKeysCommand.addCommand(createCommand);
userApiKeysCommand.addCommand(updateCommand);
userApiKeysCommand.addCommand(deleteCommand);
