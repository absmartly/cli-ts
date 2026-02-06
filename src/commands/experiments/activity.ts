import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const activityCommand = new Command('activity').description('Activity operations');

const listActivityCommand = new Command('list')
  .description('List all activity notes for an experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(listActivityCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const notes = await client.listExperimentNotes(id);

      if (notes.length === 0) {
        console.log(chalk.blue('ℹ No activity found'));
        return;
      }

      const output = formatOutput(notes, globalOptions.output as any, {
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

activityCommand.addCommand(listActivityCommand);
