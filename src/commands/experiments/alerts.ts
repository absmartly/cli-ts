import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const alertsCommand = new Command('alerts').description('Alert operations');

const listAlertsCommand = new Command('list')
  .description('List alerts for an experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(listAlertsCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const alerts = await client.listExperimentAlerts(id);

      if (alerts.length === 0) {
        console.log(chalk.blue('ℹ No alerts found'));
        return;
      }

      const output = formatOutput(alerts, globalOptions.output, {
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

const deleteAllAlertsCommand = new Command('delete-all')
  .description('Delete all alerts for an experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteAllAlertsCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteExperimentAlerts(id);

      console.log(chalk.green(`✓ All alerts deleted for experiment ${id}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

alertsCommand.addCommand(listAlertsCommand);
alertsCommand.addCommand(deleteAllAlertsCommand);
