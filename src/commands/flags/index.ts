import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const flagsCommand = new Command('flags')
  .alias('flag')
  .alias('features')
  .alias('feature')
  .description('Feature flag commands');

const listCommand = new Command('list')
  .description('List all feature flags')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const flags = await client.listExperiments({
      type: 'feature',
      limit: options.limit,
      offset: options.offset,
    });
    printFormatted(flags, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get feature flag details')
  .argument('<id>', 'flag ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const flag = await client.getExperiment(id);
    printFormatted(flag, globalOptions);
  }));

flagsCommand.addCommand(listCommand);
flagsCommand.addCommand(getCommand);
