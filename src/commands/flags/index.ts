import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const flagsCommand = new Command('flags')
  .alias('flag')
  .alias('features')
  .alias('feature')
  .description('Feature flag commands');

const listCommand = new Command('list')
  .description('List all feature flags')
  .option('--items <number>', 'number of results per page', (v) => parseInt(v, 10), 100)
  .option('--page <number>', 'page number', (v) => parseInt(v, 10), 1)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const flags = await client.listExperiments({
      type: 'feature',
      items: options.items,
      page: options.page,
    });
    printFormatted(flags, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get feature flag details')
  .argument('<id>', 'flag ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const flag = await client.getExperiment(id);
    printFormatted(flag, globalOptions);
  }));

flagsCommand.addCommand(listCommand);
flagsCommand.addCommand(getCommand);
