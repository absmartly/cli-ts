import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseCustomSectionFieldId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';
import type { CustomSectionField } from '../../api-client/types.js';

export const customFieldsCommand = new Command('custom-fields')
  .alias('customfields')
  .alias('custom-field')
  .alias('fields')
  .description('Experiment custom section field commands');

const listCommand = new Command('list')
  .description('List all experiment custom section fields')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const fields = await client.listCustomSectionFields(options.limit, options.offset);
    printFormatted(fields, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get custom section field details')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .action(withErrorHandling(async (id: CustomSectionFieldId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const field = await client.getCustomSectionField(id);
    printFormatted(field, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new experiment custom section field')
  .requiredOption('--name <name>', 'field name')
  .requiredOption('--type <type>', 'field type (string, number, boolean, json)')
  .option('--default-value <value>', 'default value for the field')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Partial<CustomSectionField> = {
      name: options.name,
      type: options.type,
    };
    if (options.defaultValue !== undefined) data.default_value = options.defaultValue;

    const field = await client.createCustomSectionField(data);

    console.log(chalk.green(`✓ Custom section field created with ID: ${field.id}`));
    printFormatted(field, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a custom section field')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--name <name>', 'new field name')
  .option('--type <type>', 'new field type (string, number, boolean, json)')
  .option('--default-value <value>', 'new default value')
  .action(withErrorHandling(async (id: CustomSectionFieldId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Partial<CustomSectionField> = {};
    if (options.name !== undefined) data.name = options.name;
    if (options.type !== undefined) data.type = options.type;
    if (options.defaultValue !== undefined) data.default_value = options.defaultValue;

    requireAtLeastOneField(data as Record<string, unknown>, 'update field');
    const field = await client.updateCustomSectionField(id, data);

    console.log(chalk.green(`✓ Custom section field ${id} updated`));
    printFormatted(field, globalOptions);
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a custom section field')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--unarchive', 'Unarchive the field')
  .action(withErrorHandling(async (id: CustomSectionFieldId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveCustomSectionField(id, !!options.unarchive);
    console.log(chalk.green(`✓ Custom section field ${id} ${options.unarchive ? 'unarchived' : 'archived'}`));
  }));

customFieldsCommand.addCommand(listCommand);
customFieldsCommand.addCommand(getCommand);
customFieldsCommand.addCommand(createCommand);
customFieldsCommand.addCommand(updateCommand);
customFieldsCommand.addCommand(archiveCommand);
