import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { diffExperimentsCore } from '../../core/experiments/diff.js';

export const diffCommand = new Command('diff')
  .description('Compare two experiments or an experiment with a previous iteration')
  .argument('<id1>', 'first experiment ID or name', parseExperimentIdOrName)
  .argument('[id2]', 'second experiment ID or name (optional if using --iteration)', (v) =>
    parseExperimentIdOrName(v)
  )
  .option('--iteration <n>', 'compare with iteration number n', parseInt)
  .action(
    withErrorHandling(async (nameOrId1: string, nameOrId2: string | undefined, options) => {
      const globalOptions = getGlobalOptions(diffCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const id1 = await client.resolveExperimentId(nameOrId1);
      const id2 = nameOrId2 ? await client.resolveExperimentId(nameOrId2) : undefined;

      const result = await diffExperimentsCore(client, {
        experimentId1: id1,
        experimentId2: id2,
        iteration: options.iteration,
        raw: globalOptions.raw,
      });

      if (result.data.length === 0) {
        console.log('No differences found.');
        return;
      }

      printFormatted(result.data, globalOptions);
    })
  );
