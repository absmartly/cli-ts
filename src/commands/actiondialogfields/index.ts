import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { validateJSON } from '../../lib/utils/validators.js';

export const actionDialogFieldsCommand = new Command('action-dialog-fields')
  .aliases(['actiondialogfields'])
  .description('Action dialog field management');

const listCommand = new Command('list')
  .description('List action dialog fields')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const fields = await client.listExperimentActionDialogFields();
    printFormatted(fields, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get action dialog field details')
  .argument('<id>', 'action dialog field ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const field = await client.getExperimentActionDialogField(id);
    printFormatted(field, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new action dialog field')
  .requiredOption('--config <json>', 'action dialog field configuration as JSON')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const field = await client.createExperimentActionDialogField(config);
    console.log(chalk.green(`✓ Action dialog field created`));
    printFormatted(field, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update an action dialog field')
  .argument('<id>', 'action dialog field ID', parseInt)
  .requiredOption('--config <json>', 'action dialog field configuration as JSON')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const field = await client.updateExperimentActionDialogField(id, config);
    console.log(chalk.green(`✓ Action dialog field ${id} updated`));
    printFormatted(field, globalOptions);
  }));

actionDialogFieldsCommand.addCommand(listCommand);
actionDialogFieldsCommand.addCommand(getCommand);
actionDialogFieldsCommand.addCommand(createCommand);
actionDialogFieldsCommand.addCommand(updateCommand);
