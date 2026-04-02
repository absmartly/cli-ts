import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { searchExperiments } from '../../core/experiments/search.js';

export const searchCommand = new Command('search')
  .description('Search for experiments by name or display name')
  .argument('<query>', 'search query')
  .option('-l, --limit <number>', 'maximum number of results', (v: string) => parseInt(v, 10), 50)
  .action(withErrorHandling(async (query: string, options) => {
    const globalOptions = getGlobalOptions(searchCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const result = await searchExperiments(client, { query, limit: options.limit });
    printFormatted(result.data, globalOptions);
  }));
