import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';

export const startCommand = new Command('start')
  .description('Start experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(startCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.startExperiment(id);

      console.log(chalk.green(`✓ Experiment ${id} started`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
