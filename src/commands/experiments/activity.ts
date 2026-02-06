import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const activityCommand = new Command('activity').description('Activity operations');

const listActivityCommand = new Command('list')
  .description('List all activity notes for an experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(listActivityCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const notes = await client.listExperimentNotes(id);

    if (notes.length === 0) {
      console.log(chalk.blue('ℹ No activity found'));
      return;
    }

    printFormatted(notes, globalOptions);
  }));

activityCommand.addCommand(listActivityCommand);
