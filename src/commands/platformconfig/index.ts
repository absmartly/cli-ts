import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { validateJSON } from '../../lib/utils/validators.js';
import { listPlatformConfigs } from '../../core/platformconfig/list.js';
import { getPlatformConfig } from '../../core/platformconfig/get.js';
import { updatePlatformConfig } from '../../core/platformconfig/update.js';

export const platformConfigCommand = new Command('platform-config')
  .aliases(['platformconfig', 'platform-configs'])
  .description('Platform configuration commands');

const listCommand = new Command('list')
  .description('List platform configurations')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listPlatformConfigs(client);
    printFormatted(result.data, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get platform configuration details')
  .argument('<id>', 'configuration ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await getPlatformConfig(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a platform configuration')
  .argument('<id>', 'configuration ID', parseInt)
  .requiredOption('--value <json>', 'configuration value as JSON')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const value = validateJSON(options.value, '--value') as Record<string, unknown>;
    const result = await updatePlatformConfig(client, { id, value });
    console.log(chalk.green(`✓ Platform config ${id} updated`));
    printFormatted(result.data, globalOptions);
  }));

platformConfigCommand.addCommand(listCommand);
platformConfigCommand.addCommand(getCommand);
platformConfigCommand.addCommand(updateCommand);
