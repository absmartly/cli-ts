import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId } from '../../lib/utils/validators.js';

export const startCommand = new Command('start')
  .description('Start experiment')
  .argument('<id>', 'experiment ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(startCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.startExperiment(id);
    console.log(chalk.green(`✓ Experiment ${id} started`));
  }));
