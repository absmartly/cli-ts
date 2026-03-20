import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseCustomSectionId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { CustomSectionId } from '../../lib/api/branded-types.js';

export const customSectionsCommand = new Command('custom-sections')
  .alias('customsections')
  .description('Experiment custom section commands');

const listCommand = new Command('list')
  .description('List all experiment custom sections')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const sections = await client.listCustomSections();
    printFormatted(sections, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new experiment custom section')
  .requiredOption('--name <name>', 'section name')
  .requiredOption('--type <type>', 'section type')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const section = await client.createCustomSection({ name: options.name, type: options.type });
    console.log(chalk.green(`✓ Custom section created`));
    printFormatted(section, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a custom section')
  .argument('<id>', 'section ID', parseCustomSectionId)
  .option('--name <name>', 'new section name')
  .action(withErrorHandling(async (id: CustomSectionId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const data: Record<string, unknown> = {};
    if (options.name !== undefined) data.name = options.name;
    requireAtLeastOneField(data, 'update field');
    const section = await client.updateCustomSection(id, data);
    console.log(chalk.green(`✓ Custom section ${id} updated`));
    printFormatted(section, globalOptions);
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a custom section')
  .argument('<id>', 'section ID', parseCustomSectionId)
  .option('--unarchive', 'unarchive the section')
  .action(withErrorHandling(async (id: CustomSectionId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.archiveCustomSection(id, !!options.unarchive);
    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Custom section ${id} ${action}`));
  }));

const reorderCommand = new Command('reorder')
  .description('Reorder custom sections')
  .requiredOption('--sections <pairs>', 'comma-separated id:order_index pairs (e.g., 1:0,2:1,3:2)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(reorderCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const sections = options.sections.split(',').map((pair: string) => {
      const [idStr, orderStr] = pair.trim().split(':');
      return { id: parseInt(idStr ?? '', 10), order_index: parseInt(orderStr ?? '', 10) };
    });
    await client.reorderCustomSections(sections);
    console.log(chalk.green(`✓ Custom sections reordered`));
  }));

customSectionsCommand.addCommand(listCommand);
customSectionsCommand.addCommand(createCommand);
customSectionsCommand.addCommand(updateCommand);
customSectionsCommand.addCommand(archiveCommand);
customSectionsCommand.addCommand(reorderCommand);
