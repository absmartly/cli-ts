import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID', parseInt)
  .option('--activity', 'include activity notes in the output')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const experiment = await client.getExperiment(id);

      if (options.activity) {
        const notes = await client.listExperimentNotes(id);
        (experiment as any).activity = notes;
      }

      const output = formatOutput(experiment, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
