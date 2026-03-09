import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const searchCommand = new Command('search')
  .description('Search for experiments by name or display name')
  .argument('<query>', 'search query')
  .option('-l, --limit <number>', 'maximum number of results', (v: string) => parseInt(v, 10), 50)
  .action(withErrorHandling(async (query: string, options) => {
    const globalOptions = getGlobalOptions(searchCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiments = await client.searchExperiments(query, options.limit);
    printFormatted(experiments, globalOptions);
  }));
