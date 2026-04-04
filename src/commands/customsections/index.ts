import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseCustomSectionId } from '../../lib/utils/validators.js';
import type { CustomSectionId } from '../../lib/api/branded-types.js';
import { listCustomSections, createCustomSection, updateCustomSection, archiveCustomSection, reorderCustomSections } from '../../core/customsections/customsections.js';

export const customSectionsCommand = new Command('custom-sections')
  .alias('customsections')
  .description('Experiment custom section commands');

const listCommand = new Command('list')
  .description('List all experiment custom sections')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listCustomSections(client);
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new experiment custom section')
  .requiredOption('--name <name>', 'section name')
  .requiredOption('--type <type>', 'section type')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await createCustomSection(client, { name: options.name, type: options.type });
    console.log(chalk.green(`✓ Custom section created`));
    printFormatted(result.data, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a custom section')
  .argument('<id>', 'section ID', parseCustomSectionId)
  .option('--name <name>', 'new section name')
  .action(withErrorHandling(async (id: CustomSectionId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await updateCustomSection(client, { id, name: options.name });
    console.log(chalk.green(`✓ Custom section ${id} updated`));
    printFormatted(result.data, globalOptions);
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a custom section')
  .argument('<id>', 'section ID', parseCustomSectionId)
  .option('--unarchive', 'unarchive the section')
  .action(withErrorHandling(async (id: CustomSectionId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await archiveCustomSection(client, { id, unarchive: !!options.unarchive });
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
    await reorderCustomSections(client, { sections });
    console.log(chalk.green(`✓ Custom sections reordered`));
  }));

customSectionsCommand.addCommand(listCommand);
customSectionsCommand.addCommand(createCommand);
customSectionsCommand.addCommand(updateCommand);
customSectionsCommand.addCommand(archiveCommand);
customSectionsCommand.addCommand(reorderCommand);
