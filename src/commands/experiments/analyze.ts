import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { analyzeExperiment } from '../../core/experiments/analyze/index.js';

export const analyzeCommand = new Command('analyze')
  .description('Analyze experiment design, signals, alerts, and related-experiment benchmarks')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .action(
    withErrorHandling(async (nameOrId: string) => {
      const globalOptions = getGlobalOptions(analyzeCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

      const result = await analyzeExperiment(client, { experimentId: id });
      printFormatted(result.detail!, globalOptions);
    })
  );
