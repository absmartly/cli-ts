import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const developmentCommand = new Command('development')
  .alias('dev')
  .description('Put experiment into development mode')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--note <text>', 'note about the action', 'Started development via CLI')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(developmentCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.developmentExperiment(id, options.note);
    console.log(chalk.green(`✓ Experiment ${id} set to development mode`));
  }));
