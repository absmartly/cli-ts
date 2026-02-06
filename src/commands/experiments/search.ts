import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const searchCommand = new Command('search')
  .description('Search for experiments by name or display name')
  .argument('<query>', 'search query')
  .option('-l, --limit <number>', 'maximum number of results', parseInt, 50)
  .action(async (query: string, options) => {
    try {
      const globalOptions = getGlobalOptions(searchCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const experiments = await client.searchExperiments(query, options.limit);

      const output = formatOutput(experiments, globalOptions.output, {
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
