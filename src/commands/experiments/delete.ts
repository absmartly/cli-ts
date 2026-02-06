import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';

export const deleteCommand = new Command('delete')
  .description('Delete experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteExperiment(id);

      console.log(chalk.green(`✓ Experiment ${id} deleted`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
