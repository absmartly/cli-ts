import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';

export const fullOnCommand = new Command('full-on')
  .description('Set experiment to full-on mode with a specific variant')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .requiredOption('--variant <number>', 'variant number to set as full-on (>= 1)', (v) => {
    const num = parseInt(v, 10);
    if (!Number.isInteger(num) || num < 1) {
      throw new Error(`Invalid variant: "${v}" must be an integer >= 1`);
    }
    return num;
  })
  .option('--note <text>', 'note about the action', 'Set to full-on via CLI')
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(fullOnCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);

    await client.fullOnExperiment(id, options.variant, options.note);
    console.log(chalk.green(`✓ Experiment ${id} set to full-on (variant ${options.variant})`));
  }));
