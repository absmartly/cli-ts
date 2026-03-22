import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseApiKeyId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { ApiKeyId } from '../../lib/api/branded-types.js';

export const apiKeysCommand = new Command('api-keys')
  .aliases(['apikeys', 'apikey', 'api-key'])
  .description('API key commands');

const listCommand = createListCommand({
  description: 'List all API keys',
  fetch: (client, options) => client.listApiKeys(options.items as number, options.page as number),
});

const getCommand = new Command('get')
  .description('Get API key details')
  .argument('<id>', 'API key ID', parseApiKeyId)
  .action(withErrorHandling(async (id: ApiKeyId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const apiKey = await client.getApiKey(id);
    printFormatted(apiKey, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new API key')
  .requiredOption('--name <name>', 'API key name')
  .option('--description <text>', 'API key description')
  .option('--permissions <permissions>', 'permissions for the API key')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const apiKey = await client.createApiKey({
      name: options.name,
      description: options.description,
      permissions: options.permissions,
    });

    const key = (apiKey as Record<string, unknown>).key as string | undefined;
    console.log(chalk.green(`✓ API key created with ID: ${apiKey.id}`));
    if (key) {
      console.log(`  Key: ${key}`);
      console.log(chalk.yellow('  Save this key now — it cannot be retrieved later.'));
    }
  }));

const updateCommand = new Command('update')
  .description('Update an API key')
  .argument('<id>', 'API key ID', parseApiKeyId)
  .option('--name <name>', 'new name')
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: ApiKeyId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.name !== undefined) data.name = options.name;
    if (options.description !== undefined) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateApiKey(id, data);
    console.log(chalk.green(`✓ API key ${id} updated`));
  }));

const deleteCommand = new Command('delete')
  .description('Delete an API key')
  .argument('<id>', 'API key ID', parseApiKeyId)
  .action(withErrorHandling(async (id: ApiKeyId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteApiKey(id);
    console.log(chalk.green(`✓ API key ${id} deleted`));
  }));

apiKeysCommand.addCommand(listCommand);
apiKeysCommand.addCommand(getCommand);
apiKeysCommand.addCommand(createCommand);
apiKeysCommand.addCommand(updateCommand);
apiKeysCommand.addCommand(deleteCommand);
