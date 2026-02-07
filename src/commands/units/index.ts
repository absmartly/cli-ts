import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId } from '../../lib/utils/validators.js';

export const unitsCommand = new Command('units')
  .alias('unit')
  .description('Unit type commands');

const listCommand = new Command('list')
  .description('List all unit types')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const units = await client.listUnitTypes();
    printFormatted(units, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get unit type details')
  .argument('<id>', 'unit type ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const unit = await client.getUnitType(id);
    printFormatted(unit, globalOptions);
  }));

unitsCommand.addCommand(listCommand);
unitsCommand.addCommand(getCommand);
