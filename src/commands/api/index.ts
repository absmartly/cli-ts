import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';

export const apiCommand = new Command('api')
  .description('Make raw API requests')
  .argument('<path>', 'API path (e.g., /experiments)')
  .option('-X, --method <method>', 'HTTP method', 'GET')
  .option('-d, --data <data>', 'request body (JSON string)')
  .option('-H, --header <header>', 'custom headers (can be used multiple times)', collect, [])
  .action(async (path: string, options) => {
    try {
      const globalOptions = getGlobalOptions(apiCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const headers: Record<string, string> = {};
      for (const header of options.header) {
        const [key, ...valueParts] = header.split(':');
        headers[key.trim()] = valueParts.join(':').trim();
      }

      const data = options.data ? JSON.parse(options.data) : undefined;

      const result = await client.rawRequest(path, options.method, data, headers);

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
