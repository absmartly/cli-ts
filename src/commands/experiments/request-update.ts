import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const requestUpdateCommand = new Command('request-update')
  .description('Request analysis update for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(requestUpdateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.requestExperimentUpdate(id);
    console.log(chalk.green(`✓ Analysis update requested for experiment ${id}`));
  }));
