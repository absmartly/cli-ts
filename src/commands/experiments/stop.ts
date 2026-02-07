import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId } from '../../lib/utils/validators.js';

export const stopCommand = new Command('stop')
  .description('Stop experiment')
  .argument('<id>', 'experiment ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(stopCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.stopExperiment(id);
    console.log(chalk.green(`✓ Experiment ${id} stopped`));
  }));
