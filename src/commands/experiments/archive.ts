import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';

export const archiveCommand = new Command('archive')
  .description('Archive or unarchive experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--unarchive', 'unarchive the experiment')
  .option('--note <text>', 'activity log note')
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);

    await client.archiveExperiment(id, options.unarchive, options.note);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Experiment ${id} ${action}`));
  }));
