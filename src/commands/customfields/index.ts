import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseCustomSectionFieldId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import { summarizeCustomFieldRow } from '../../api-client/entity-summary.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';
import { getCustomField } from '../../core/customfields/get.js';
import { createCustomField } from '../../core/customfields/create.js';
import { updateCustomField } from '../../core/customfields/update.js';
import { archiveCustomField } from '../../core/customfields/archive.js';

export const customFieldsCommand = new Command('custom-fields')
  .alias('customfields')
  .alias('custom-field')
  .alias('fields')
  .description('Experiment custom section field commands');

const listCommand = createListCommand({
  description: 'List all experiment custom section fields',
  defaultItems: 100,
  fetch: (client, options) =>
    client.listCustomSectionFields({
      items: options.items as number,
      page: options.page as number,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sort_asc: options.asc ? true : options.desc ? false : undefined,
      archived: options.archived as boolean,
      ids: options.ids as string | undefined,
    }),
  summarizeRow: summarizeCustomFieldRow,
});

const getCommand = new Command('get')
  .description('Get custom section field details')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(
    withErrorHandling(async (id: CustomSectionFieldId, options) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const show = (options.show as string[] | undefined) ?? [];
      const exclude = (options.exclude as string[] | undefined) ?? [];
      const result = await getCustomField(client, { id, show, exclude, raw: globalOptions.raw });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new experiment custom section field')
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

      if (!options.name && !options.type && options.defaultValue === undefined) {
        throw new Error(
          'At least one of --name, --type, or --default-value must be provided for update'
        );
      }

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

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a custom section field')
  .argument('<id>', 'field ID', parseCustomSectionFieldId)
  .option('--unarchive', 'Unarchive the field')
  .action(
    withErrorHandling(async (id: CustomSectionFieldId, options) => {
      const globalOptions = getGlobalOptions(archiveCommand);
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
customFieldsCommand.addCommand(archiveCommand);
