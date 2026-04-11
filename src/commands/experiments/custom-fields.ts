import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseCustomSectionFieldId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { addPaginationOptions, printPaginationFooter } from '../../lib/utils/pagination.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';
import { getDefaultType } from './default-type.js';
import {
  listCustomFields,
  getCustomField,
  createCustomField,
  updateCustomField,
  archiveCustomField,
} from '../../core/experiments/custom-fields.js';

export const customFieldsCommand = new Command('custom-fields')
  .alias('fields')
  .description('Manage custom section fields');

const listCommand = addPaginationOptions(
  new Command('list').description('List custom section fields')
).action(
  withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const result = await listCustomFields(client, {
      type: getDefaultType(),
      items: options.items ?? 100,
      page: options.page ?? 1,
      raw: globalOptions.raw,
    });

    printFormatted(result.rows ?? result.data, globalOptions);
    printPaginationFooter(
      (result.rows ?? result.data).length,
      options.items ?? 100,
      options.page ?? 1,
      globalOptions.output as string
    );
  })
);

const getCommand = new Command('get')
  .description('Get custom section field details')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(
    withErrorHandling(async (id: CustomSectionFieldId, options) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const result = await getCustomField(client, {
        id,
        show: options.show,
        exclude: options.exclude,
        raw: globalOptions.raw,
      });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new custom section field')
  .requiredOption('--name <name>', 'field name')
  .requiredOption('--type <type>', 'field type (string, number, boolean, json)')
  .option('--default-value <value>', 'default value for the field')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const result = await createCustomField(client, {
        name: options.name,
        type: options.type,
        defaultValue: options.defaultValue,
      });

      console.log(
        chalk.green(
          `✓ Custom section field created with ID: ${(result.data as Record<string, unknown>).id}`
        )
      );
      printFormatted(result.data, globalOptions);
    })
  );

const updateCommand = new Command('update')
  .description('Update a custom section field')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--name <name>', 'new field name')
  .option('--type <type>', 'new field type (string, number, boolean, json)')
  .option('--default-value <value>', 'new default value')
  .action(
    withErrorHandling(async (id: CustomSectionFieldId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: Record<string, unknown> = {};
      if (options.name !== undefined) data.name = options.name;
      if (options.type !== undefined) data.type = options.type;
      if (options.defaultValue !== undefined) data.defaultValue = options.defaultValue;
      requireAtLeastOneField(data, 'update field');

      const result = await updateCustomField(client, {
        id,
        name: options.name,
        type: options.type,
        defaultValue: options.defaultValue,
      });

      console.log(chalk.green(`✓ Custom section field ${id} updated`));
      printFormatted(result.data, globalOptions);
    })
  );

const archiveCmd = new Command('archive')
  .description('Archive or unarchive a custom section field')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--unarchive', 'Unarchive the field')
  .action(
    withErrorHandling(async (id: CustomSectionFieldId, options) => {
      const globalOptions = getGlobalOptions(archiveCmd);
      const client = await getAPIClientFromOptions(globalOptions);

      await archiveCustomField(client, { id, unarchive: !!options.unarchive });
      console.log(
        chalk.green(`✓ Custom section field ${id} ${options.unarchive ? 'unarchived' : 'archived'}`)
      );
    })
  );

customFieldsCommand.addCommand(listCommand);
customFieldsCommand.addCommand(getCommand);
customFieldsCommand.addCommand(createCommand);
customFieldsCommand.addCommand(updateCommand);
customFieldsCommand.addCommand(archiveCmd);
