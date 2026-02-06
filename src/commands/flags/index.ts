import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const flagsCommand = new Command('flags')
  .alias('flag')
  .alias('features')
  .alias('feature')
  .description('Feature flag commands');

const listCommand = new Command('list')
  .description('List all feature flags')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const flags = await client.listExperiments({
        type: 'feature',
        limit: options.limit,
        offset: options.offset,
      });

      const output = formatOutput(flags, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const getCommand = new Command('get')
  .description('Get feature flag details')
  .argument('<id>', 'flag ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const flag = await client.getExperiment(id);

      const output = formatOutput(flag, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

flagsCommand.addCommand(listCommand);
flagsCommand.addCommand(getCommand);
