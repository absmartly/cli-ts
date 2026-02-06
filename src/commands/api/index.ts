import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';

export const apiCommand = new Command('api')
  .description('Make raw API requests')
  .argument('<path>', 'API path (e.g., /experiments)')
  .option('-X, --method <method>', 'HTTP method', 'GET')
  .option('-d, --data <data>', 'request body (JSON string)')
  .option('-H, --header <header>', 'custom headers (can be used multiple times)', collect, [])
  .action(withErrorHandling(async (path: string, options) => {
    const globalOptions = getGlobalOptions(apiCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const headers: Record<string, string> = {};
    for (const header of options.header) {
      const [key, ...valueParts] = header.split(':');
      headers[key.trim()] = valueParts.join(':').trim();
    }

    let data: unknown;
    if (options.data) {
      try {
        data = JSON.parse(options.data);
      } catch (parseError) {
        throw new Error(
          `Invalid JSON in --data option: ${parseError instanceof Error ? parseError.message : 'unknown error'}\n` +
          `\n` +
          `Example: --data '{"name": "test", "type": "experiment"}'\n` +
          `\n` +
          `Your input: ${options.data}`
        );
      }
    }

    const result = await client.rawRequest(path, options.method, data, headers);
    console.log(JSON.stringify(result, null, 2));
  }));

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
