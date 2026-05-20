import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { addPaginationOptions, printPaginationFooter } from '../../lib/utils/pagination.js';
import {
  listUserApiKeys as coreListUserApiKeys,
  getUserApiKey as coreGetUserApiKey,
  createUserApiKey as coreCreateUserApiKey,
  updateUserApiKey as coreUpdateUserApiKey,
  deleteUserApiKey as coreDeleteUserApiKey,
} from '../../core/users/api-keys.js';

export const userApiKeysCommand = new Command('api-keys')
  .alias('api-key')
  .description('Manage API keys for a user');

const listCommand = addPaginationOptions(
  new Command('list')
    .description('List API keys for a user')
    .requiredOption('--user <value>', 'user ID, name, or email')
).action(
  withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await coreListUserApiKeys(client, {
      userRef: options.user as string,
      items: options.items,
      page: options.page,
    });
    printFormatted(result.data, globalOptions);
    printPaginationFooter(
      result.data.length,
      options.items,
      options.page,
      globalOptions.output as string
    );
  })
);

const getCommand = new Command('get')
  .description('Get an API key for a user')
  .argument('<id>', 'API key ID', parseInt)
  .requiredOption('--user <value>', 'user ID, name, or email')
  .action(
    withErrorHandling(async (id: number, options) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await coreGetUserApiKey(client, {
        userRef: options.user as string,
        keyId: id,
      });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create an API key for a user')
  .requiredOption('--user <value>', 'user ID, name, or email')
  .requiredOption('--name <name>', 'API key name')
  .option('--description <text>', 'API key description')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await coreCreateUserApiKey(client, {
        userRef: options.user as string,
        name: options.name,
        description: options.description,
      });
      const format = globalOptions.output ?? 'table';
      if (format === 'table' || format === 'rendered') {
        console.log(chalk.green(`✓ API key created: ${result.data.name}`));
        console.log(`  Key: ${result.data.key}`);
        console.log(chalk.yellow('  Save this key now — it cannot be retrieved later.'));
      } else {
        const data = result.data as Record<string, unknown>;
        printResult(globalOptions, {
          message: `✓ API key created: ${result.data.name}`,
          id: data.id,
          raw: result.data,
        });
      }
    })
  );

const updateCommand = new Command('update')
  .description('Update an API key for a user')
  .argument('<id>', 'API key ID', parseInt)
  .requiredOption('--user <value>', 'user ID, name, or email')
  .option('--name <name>', 'new name')
  .option('--description <text>', 'new description')
  .action(
    withErrorHandling(async (id: number, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await coreUpdateUserApiKey(client, {
        userRef: options.user as string,
        keyId: id,
        name: options.name,
        description: options.description,
      });
      printResult(globalOptions, { message: `✓ API key ${id} updated`, id });
    })
  );

const deleteCommand = new Command('delete')
  .description('Delete an API key for a user')
  .argument('<id>', 'API key ID', parseInt)
  .requiredOption('--user <value>', 'user ID, name, or email')
  .action(
    withErrorHandling(async (id: number, options) => {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await coreDeleteUserApiKey(client, {
        userRef: options.user as string,
        keyId: id,
      });
      printResult(globalOptions, { message: `✓ API key ${id} deleted`, id });
    })
  );

userApiKeysCommand.addCommand(listCommand);
userApiKeysCommand.addCommand(getCommand);
userApiKeysCommand.addCommand(createCommand);
userApiKeysCommand.addCommand(updateCommand);
userApiKeysCommand.addCommand(deleteCommand);
