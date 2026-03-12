import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const parentCommand = new Command('parent')
  .description('Get the parent experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(parentCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getParentExperiment(id);
    printFormatted(experiment, globalOptions);
  }));
