import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId } from '../../lib/utils/validators.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID', parseId)
  .option('--activity', 'include activity notes in the output')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);

    if (options.activity) {
      const notes = await client.listExperimentNotes(id);
      printFormatted({ ...experiment, activity: notes }, globalOptions);
    } else {
      printFormatted(experiment, globalOptions);
    }
  }));
