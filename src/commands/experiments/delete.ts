import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId } from '../../lib/utils/validators.js';

export const deleteCommand = new Command('delete')
  .description('Delete experiment')
  .argument('<id>', 'experiment ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteExperiment(id);
    console.log(chalk.green(`✓ Experiment ${id} deleted`));
  }));
