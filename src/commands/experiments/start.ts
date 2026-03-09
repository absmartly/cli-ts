import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const startCommand = new Command('start')
  .description('Start experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(startCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);
    if (experiment.state === 'created') {
      console.error(chalk.red(`Error: Experiment ${id} is in draft (created) state.`));
      console.error(chalk.yellow(`Set it to 'ready' before starting. Draft experiments need to be finalized first.`));
      process.exit(1);
    }

    await client.startExperiment(id);
    console.log(chalk.green(`✓ Experiment ${id} started`));
  }));
