import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { summarizeExperiment } from '../../api-client/experiment-summary.js';
import { diffExperiments } from '../../api-client/experiment-diff.js';
import { parseExperimentIdOrName } from './resolve-id.js';

export const diffCommand = new Command('diff')
  .description('Compare two experiments or an experiment with a previous iteration')
  .argument('<id1>', 'first experiment ID or name', parseExperimentIdOrName)
  .argument('[id2]', 'second experiment ID or name (optional if using --iteration)', (v) => parseExperimentIdOrName(v))
  .option('--iteration <n>', 'compare with iteration number n', parseInt)
  .action(withErrorHandling(async (nameOrId1: string, nameOrId2: string | undefined, options) => {
    const globalOptions = getGlobalOptions(diffCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    if (!nameOrId2 && options.iteration === undefined) {
      throw new Error('Provide a second experiment ID or use --iteration <n>');
    }

    const id1 = await client.resolveExperimentId(nameOrId1);
    const exp1 = await client.getExperiment(id1);

    let exp2: Record<string, unknown>;
    if (options.iteration !== undefined) {
      const iterations = await client.listExperiments({ iterations_of: id1 as number });
      const target = iterations.find(
        (it: Record<string, unknown>) => it.iteration === options.iteration,
      );
      if (!target) {
        const available = iterations.map((it: Record<string, unknown>) => it.iteration);
        throw new Error(
          `Iteration ${options.iteration} not found for experiment ${id1}. Available: ${available.join(', ')}`,
        );
      }
      exp2 = target as Record<string, unknown>;
    } else {
      const id2 = await client.resolveExperimentId(nameOrId2!);
      exp2 = await client.getExperiment(id2) as Record<string, unknown>;
    }

    const left = globalOptions.raw
      ? exp1 as Record<string, unknown>
      : summarizeExperiment(exp1 as Record<string, unknown>);
    const right = globalOptions.raw
      ? exp2
      : summarizeExperiment(exp2);

    const diffs = diffExperiments(left, right);

    if (diffs.length === 0) {
      console.log('No differences found.');
      return;
    }

    const rows = diffs.map(d => ({
      field: d.field,
      left: typeof d.left === 'object' ? JSON.stringify(d.left) : String(d.left ?? ''),
      right: typeof d.right === 'object' ? JSON.stringify(d.right) : String(d.right ?? ''),
    }));

    printFormatted(rows, globalOptions);
  }));
