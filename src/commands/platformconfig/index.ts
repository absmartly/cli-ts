import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { validateJSON } from '../../lib/utils/validators.js';

export const platformConfigCommand = new Command('platform-config')
  .aliases(['platformconfig', 'platform-configs'])
  .description('Platform configuration commands');

const listCommand = new Command('list')
  .description('List platform configurations')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const configs = await client.listPlatformConfigs();
    printFormatted(configs, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get platform configuration details')
  .argument('<id>', 'configuration ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = await client.getPlatformConfig(id);
    printFormatted(config, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a platform configuration')
  .argument('<id>', 'configuration ID', parseInt)
  .requiredOption('--value <json>', 'configuration value as JSON')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const value = validateJSON(options.value, '--value') as Record<string, unknown>;
    const config = await client.updatePlatformConfig(id, value);
    console.log(chalk.green(`✓ Platform config ${id} updated`));
    printFormatted(config, globalOptions);
  }));

platformConfigCommand.addCommand(listCommand);
platformConfigCommand.addCommand(getCommand);
platformConfigCommand.addCommand(updateCommand);
