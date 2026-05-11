import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { analyzeExperiment } from '../../core/experiments/analyze/index.js';

function isOutputExplicit(cmd: Command): boolean {
  let current: Command | undefined = cmd;
  while (current) {
    const src = current.getOptionValueSource('output');
    if (src === 'cli' || src === 'env') return true;
    current = current.parent ?? undefined;
  }
  return false;
}

export const analyzeCommand = new Command('analyze')
  .description('Analyze experiment design, signals, alerts, and related-experiment benchmarks')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .action(
    withErrorHandling(async (nameOrId: string) => {
      const globalOptions = getGlobalOptions(analyzeCommand);
      if (!isOutputExplicit(analyzeCommand)) globalOptions.output = 'json';
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

      const result = await analyzeExperiment(client, { experimentId: id });

      const useFull = globalOptions.output === 'json' || globalOptions.output === 'yaml';
      if (useFull) {
        printFormatted(result.data as unknown as Record<string, unknown>, globalOptions);
      } else {
        printFormatted(result.detail!, globalOptions);
      }
    })
  );
