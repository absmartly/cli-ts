import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { validateJSON } from '../../lib/utils/validators.js';
import { listStorageConfigs, getStorageConfig, createStorageConfig, updateStorageConfig, testStorageConfig } from '../../core/storageconfigs/storageconfigs.js';

export const storageConfigsCommand = new Command('storage-configs')
  .aliases(['storageconfigs', 'storage-config'])
  .description('Storage config management');

const listCommand = new Command('list')
  .description('List storage configs')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listStorageConfigs(client);
    printFormatted(result.data, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get storage config details')
  .argument('<id>', 'storage config ID', (v: string) => parseInt(v, 10))
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await getStorageConfig(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new storage config')
  .requiredOption('--config <json>', 'storage config configuration as JSON')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const result = await createStorageConfig(client, { config });
    console.log(chalk.green(`✓ Storage config created`));
    printFormatted(result.data, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a storage config')
  .argument('<id>', 'storage config ID', (v: string) => parseInt(v, 10))
  .requiredOption('--config <json>', 'storage config configuration as JSON')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const result = await updateStorageConfig(client, { id, config });
    console.log(chalk.green(`✓ Storage config ${id} updated`));
    printFormatted(result.data, globalOptions);
  }));

const testCommand = new Command('test')
  .description('Test storage config connection')
  .requiredOption('--config <json>', 'storage config configuration as JSON')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(testCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    await testStorageConfig(client, { config });
    console.log(chalk.green(`✓ Storage config connection test passed`));
  }));

storageConfigsCommand.addCommand(listCommand);
storageConfigsCommand.addCommand(getCommand);
storageConfigsCommand.addCommand(createCommand);
storageConfigsCommand.addCommand(updateCommand);
storageConfigsCommand.addCommand(testCommand);
