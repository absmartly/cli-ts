import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseCustomSectionFieldId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { applyShowExclude, summarizeCustomField, summarizeCustomFieldRow } from '../../api-client/entity-summary.js';
import { addPaginationOptions, printPaginationFooter } from '../../lib/utils/pagination.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';
import type { CustomSectionField } from '../../api-client/types.js';
import { getDefaultType } from './default-type.js';

export const customFieldsCommand = new Command('custom-fields')
  .alias('fields')
  .description('Manage custom section fields');

const listCommand = addPaginationOptions(
  new Command('list')
    .description('List custom section fields'),
).action(withErrorHandling(async (options) => {
  const globalOptions = getGlobalOptions(listCommand);
  const client = await getAPIClientFromOptions(globalOptions);
  const type = getDefaultType();
  const allFields = await client.listCustomSectionFields(options.items ?? 100, options.page ?? 1);
  const fields = (allFields as unknown as Array<Record<string, unknown>>).filter(f => {
    const section = f.custom_section as Record<string, unknown> | undefined;
    return section?.type === type;
  });

  if (globalOptions.raw) {
    printFormatted(fields, globalOptions);
  } else {
    const rows = fields.map(f => summarizeCustomFieldRow(f));
    printFormatted(rows, globalOptions);
  }
  printPaginationFooter(fields.length, options.items ?? 100, options.page ?? 1, globalOptions.output as string);
}));

const getCommand = new Command('get')
  .description('Get custom section field details')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(withErrorHandling(async (id: CustomSectionFieldId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const field = await client.getCustomSectionField(id);
    const data = globalOptions.raw ? field : applyShowExclude(summarizeCustomField(field as unknown as Record<string, unknown>), field as unknown as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new custom section field')
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
