import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';

export const developmentCommand = new Command('development')
  .alias('dev')
  .description('Put experiment into development mode')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--note <text>', 'note about the action', 'Started development via CLI')
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(developmentCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);

    await client.developmentExperiment(id, options.note);
    console.log(chalk.green(`✓ Experiment ${id} set to development mode`));
  }));
