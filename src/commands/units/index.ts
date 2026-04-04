import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseUnitTypeId } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { UnitTypeId } from '../../lib/api/branded-types.js';
import { getUnit, createUnit, updateUnit, archiveUnit } from '../../core/units/index.js';

export const unitsCommand = new Command('units')
  .alias('unit')
  .description('Unit type commands');

const listCommand = createListCommand({
  description: 'List all unit types',
  defaultItems: 100,
  fetch: (client, options) => client.listUnitTypes(options.items as number, options.page as number),
});

const getCommand = new Command('get')
  .description('Get unit type details')
  .argument('<id>', 'unit type ID', parseUnitTypeId)
  .action(withErrorHandling(async (id: UnitTypeId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await getUnit(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new unit type')
  .requiredOption('--name <name>', 'unit type name')
  .requiredOption('--description <description>', 'unit type description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await createUnit(client, { name: options.name, description: options.description });
    console.log(chalk.green(`✓ Unit type created with ID: ${(result.data as Record<string, unknown>).id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a unit type')
  .argument('<id>', 'unit type ID', parseUnitTypeId)
  .option('--name <name>', 'new name')
  .option('--description <description>', 'new description')
  .action(withErrorHandling(async (id: UnitTypeId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await updateUnit(client, { id, name: options.name, description: options.description });
    console.log(chalk.green(`✓ Unit type ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a unit type')
  .argument('<id>', 'unit type ID', parseUnitTypeId)
  .option('--unarchive', 'unarchive the unit type')
  .action(withErrorHandling(async (id: UnitTypeId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await archiveUnit(client, { id, unarchive: options.unarchive });
    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Unit type ${id} ${action}`));
  }));

unitsCommand.addCommand(listCommand);
unitsCommand.addCommand(getCommand);
unitsCommand.addCommand(createCommand);
unitsCommand.addCommand(updateCommand);
unitsCommand.addCommand(archiveCommand);
