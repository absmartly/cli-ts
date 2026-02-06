import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';

export const stopCommand = new Command('stop')
  .description('Stop experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(stopCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.stopExperiment(id);

      console.log(chalk.green(`✓ Experiment ${id} stopped`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
