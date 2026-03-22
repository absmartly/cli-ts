import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseUnitTypeId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { UnitTypeId } from '../../lib/api/branded-types.js';

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

    const unitType = await client.getUnitType(id);
    printFormatted(unitType, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new unit type')
  .requiredOption('--name <name>', 'unit type name')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const unitType = await client.createUnitType({ name: options.name });
    console.log(chalk.green(`✓ Unit type created with ID: ${unitType.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a unit type')
  .argument('<id>', 'unit type ID', parseUnitTypeId)
  .option('--name <name>', 'new name')
  .action(withErrorHandling(async (id: UnitTypeId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, unknown> = {};
    if (options.name) data.name = options.name;

    requireAtLeastOneField(data, 'update field');
    await client.updateUnitType(id, data);
    console.log(chalk.green(`✓ Unit type ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a unit type')
  .argument('<id>', 'unit type ID', parseUnitTypeId)
  .option('--unarchive', 'unarchive the unit type')
  .action(withErrorHandling(async (id: UnitTypeId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveUnitType(id, options.unarchive);
    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Unit type ${id} ${action}`));
  }));

unitsCommand.addCommand(listCommand);
unitsCommand.addCommand(getCommand);
unitsCommand.addCommand(createCommand);
unitsCommand.addCommand(updateCommand);
unitsCommand.addCommand(archiveCommand);
