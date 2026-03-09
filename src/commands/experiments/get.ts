import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--activity', 'include activity notes in the output')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);

    if (options.activity) {
      const notes = await client.listExperimentActivity(id);
      printFormatted({ ...experiment, activity: notes }, globalOptions);
    } else {
      printFormatted(experiment, globalOptions);
    }
  }));
