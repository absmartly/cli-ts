import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseApiKeyId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import { formatUserSummary } from '../../lib/output/formatter.js';
import type { ApiKeyId } from '../../lib/api/branded-types.js';
import { getApiKey, createApiKey, updateApiKey, deleteApiKey } from '../../core/apikeys/index.js';

export const apiKeysCommand = new Command('api-keys')
  .aliases(['apikeys', 'apikey', 'api-key'])
  .description('API key commands');

export function summarizeApiKeyRow(item: Record<string, unknown>): Record<string, unknown> {
  const summarizeUser = (v: unknown) => formatUserSummary(v) ?? '';
  return {
    id: item.id,
    name: item.name ?? '',
    description: item.description ?? '',
    key_ending: item.key_ending ?? '',
    permissions: item.permissions ?? '',
    used_at: item.used_at ?? '',
    created_at: item.created_at ?? '',
    created_by: summarizeUser(item.created_by),
    updated_at: item.updated_at ?? '',
    updated_by: summarizeUser(item.updated_by),
  };
}

const listCommand = createListCommand({
  description: 'List all API keys',
  fetch: (client, options) =>
    client.listApiKeys({
      items: options.items as number,
      page: options.page as number,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sort_asc: options.asc ? true : options.desc ? false : undefined,
      archived: options.archived as boolean,
      ids: options.ids as string | undefined,
    }),
  summarizeRow: summarizeApiKeyRow,
});

const getCommand = new Command('get')
  .description('Get API key details')
  .argument('<id>', 'API key ID', parseApiKeyId)
  .action(
    withErrorHandling(async (id: ApiKeyId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getApiKey(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new API key')
  .requiredOption('--name <name>', 'API key name')
  .option('--description <text>', 'API key description')
  .option('--permissions <permissions>', 'permissions for the API key')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createApiKey(client, {
        name: options.name,
        description: options.description,
        permissions: options.permissions,
      });
      const format = globalOptions.output ?? 'table';
      if (format === 'table' || format === 'rendered') {
        console.log(chalk.green(`✓ API key created with ID: ${result.data.id}`));
        if (result.data.key) {
          console.log(`  Key: ${result.data.key}`);
          console.log(chalk.yellow('  Save this key now — it cannot be retrieved later.'));
        }
      } else {
        printResult(globalOptions, {
          message: `✓ API key created with ID: ${result.data.id}`,
          id: result.data.id,
          raw: result.data,
        });
      }
    })
  );

const updateCommand = new Command('update')
  .description('Update an API key')
  .argument('<id>', 'API key ID', parseApiKeyId)
  .option('--name <name>', 'new name')
  .option('--description <text>', 'new description')
  .action(
    withErrorHandling(async (id: ApiKeyId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await updateApiKey(client, {
        id,
        name: options.name,
        description: options.description,
      });
      printResult(globalOptions, { message: `✓ API key ${id} updated`, id });
    })
  );

const deleteCommand = new Command('delete')
  .description('Delete an API key')
  .argument('<id>', 'API key ID', parseApiKeyId)
  .action(
    withErrorHandling(async (id: ApiKeyId) => {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await deleteApiKey(client, { id });
      printResult(globalOptions, { message: `✓ API key ${id} deleted`, id });
    })
  );

apiKeysCommand.addCommand(listCommand);
apiKeysCommand.addCommand(getCommand);
apiKeysCommand.addCommand(createCommand);
apiKeysCommand.addCommand(updateCommand);
apiKeysCommand.addCommand(deleteCommand);
