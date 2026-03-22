import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const archiveCommand = new Command('archive')
  .description('Archive or unarchive experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--unarchive', 'unarchive the experiment')
  .option('--note <text>', 'activity log note')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveExperiment(id, options.unarchive, options.note);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Experiment ${id} ${action}`));
  }));
