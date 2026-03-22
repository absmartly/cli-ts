import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';

export const startCommand = new Command('start')
  .description('Start experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--note <text>', 'activity log note')
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(startCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);

    const experiment = await client.getExperiment(id);
    if (experiment.state === 'created') {
      throw new Error(`Experiment ${id} is in draft (created) state.\nSet it to 'ready' before starting: abs experiments update ${id} --state ready`);
    }

    await client.startExperiment(id, options.note);
    console.log(chalk.green(`✓ Experiment ${id} started`));
  }));
