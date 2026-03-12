import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExportConfigId, validateJSON } from '../../lib/utils/validators.js';
import type { ExportConfigId } from '../../lib/api/branded-types.js';

export const exportConfigsCommand = new Command('export-configs')
  .aliases(['exportconfigs', 'export-config'])
  .description('Export configuration management');

const listCommand = new Command('list')
  .description('List export configurations')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const configs = await client.listExportConfigs();
    printFormatted(configs, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get export configuration details')
  .argument('<id>', 'export config ID', parseExportConfigId)
  .action(withErrorHandling(async (id: ExportConfigId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = await client.getExportConfig(id);
    printFormatted(config, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new export configuration')
  .requiredOption('--config <json>', 'export configuration as JSON')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const result = await client.createExportConfig(config);
    console.log(chalk.green(`✓ Export configuration created`));
    printFormatted(result, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update an export configuration')
  .argument('<id>', 'export config ID', parseExportConfigId)
  .requiredOption('--config <json>', 'export configuration as JSON')
  .action(withErrorHandling(async (id: ExportConfigId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const result = await client.updateExportConfig(id, config);
    console.log(chalk.green(`✓ Export configuration ${id} updated`));
    printFormatted(result, globalOptions);
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive an export configuration')
  .argument('<id>', 'export config ID', parseExportConfigId)
  .option('--unarchive', 'unarchive the configuration', false)
  .action(withErrorHandling(async (id: ExportConfigId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.archiveExportConfig(id, options.unarchive);
    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Export configuration ${id} ${action}`));
  }));

const pauseCommand = new Command('pause')
  .description('Pause an export configuration')
  .argument('<id>', 'export config ID', parseExportConfigId)
  .action(withErrorHandling(async (id: ExportConfigId) => {
    const globalOptions = getGlobalOptions(pauseCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.pauseExportConfig(id);
    console.log(chalk.green(`✓ Export configuration ${id} paused`));
  }));

const historiesCommand = new Command('histories')
  .description('List export histories for an export configuration')
  .argument('<id>', 'export config ID', parseExportConfigId)
  .action(withErrorHandling(async (id: ExportConfigId) => {
    const globalOptions = getGlobalOptions(historiesCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const histories = await client.listExportHistories(id);
    printFormatted(histories, globalOptions);
  }));

exportConfigsCommand.addCommand(listCommand);
exportConfigsCommand.addCommand(getCommand);
exportConfigsCommand.addCommand(createCommand);
exportConfigsCommand.addCommand(updateCommand);
exportConfigsCommand.addCommand(archiveCommand);
exportConfigsCommand.addCommand(pauseCommand);
exportConfigsCommand.addCommand(historiesCommand);
