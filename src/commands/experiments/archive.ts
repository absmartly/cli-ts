import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';

export const archiveCommand = new Command('archive')
  .description('Archive or unarchive experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .option('--unarchive', 'unarchive the experiment')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveExperiment(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Experiment ${id} ${action}`));
  }));
