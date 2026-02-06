import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';

export const archiveCommand = new Command('archive')
  .description('Archive or unarchive experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .option('--unarchive', 'unarchive the experiment')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.archiveExperiment(id, options.unarchive);

      const action = options.unarchive ? 'unarchived' : 'archived';
      console.log(chalk.green(`✓ Experiment ${id} ${action}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
