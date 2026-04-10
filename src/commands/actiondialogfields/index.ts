import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { validateJSON } from '../../lib/utils/validators.js';

function parsePositiveInt(value: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ID: "${value}". Expected a positive integer.`);
  }
  return parsed;
}
import {
  listActionDialogFields as coreListActionDialogFields,
  getActionDialogField as coreGetActionDialogField,
  createActionDialogField as coreCreateActionDialogField,
  updateActionDialogField as coreUpdateActionDialogField,
} from '../../core/actiondialogfields/actiondialogfields.js';

export const actionDialogFieldsCommand = new Command('action-dialog-fields')
  .aliases(['actiondialogfields'])
  .description('Action dialog field management');

const listCommand = new Command('list').description('List action dialog fields').action(
  withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await coreListActionDialogFields(client);
    printFormatted(result.data, globalOptions);
  })
);

const getCommand = new Command('get')
  .description('Get action dialog field details')
  .argument('<id>', 'action dialog field ID', parsePositiveInt)
  .action(
    withErrorHandling(async (id: number) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await coreGetActionDialogField(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new action dialog field')
  .requiredOption('--config <json>', 'action dialog field configuration as JSON')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config');
      if (config === null || Array.isArray(config) || typeof config !== 'object') {
        throw new Error('--config must be a JSON object (not null, array, or primitive)');
      }
      const result = await coreCreateActionDialogField(client, {
        config: config as Record<string, unknown>,
      });
      console.log(chalk.green(`✓ Action dialog field created`));
      printFormatted(result.data, globalOptions);
    })
  );

const updateCommand = new Command('update')
  .description('Update an action dialog field')
  .argument('<id>', 'action dialog field ID', parsePositiveInt)
  .requiredOption('--config <json>', 'action dialog field configuration as JSON')
  .action(
    withErrorHandling(async (id: number, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config');
      if (config === null || Array.isArray(config) || typeof config !== 'object') {
        throw new Error('--config must be a JSON object (not null, array, or primitive)');
      }
      const result = await coreUpdateActionDialogField(client, {
        id,
        config: config as Record<string, unknown>,
      });
      console.log(chalk.green(`✓ Action dialog field ${id} updated`));
      printFormatted(result.data, globalOptions);
    })
  );

actionDialogFieldsCommand.addCommand(listCommand);
actionDialogFieldsCommand.addCommand(getCommand);
actionDialogFieldsCommand.addCommand(createCommand);
actionDialogFieldsCommand.addCommand(updateCommand);
