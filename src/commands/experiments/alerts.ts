import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const alertsCommand = new Command('alerts').description('Alert operations');

const listAlertsCommand = new Command('list')
  .description('List alerts for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(listAlertsCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const alerts = await client.listExperimentAlerts(id);

    if (alerts.length === 0) {
      console.log(chalk.blue('ℹ No alerts found'));
      return;
    }

    printFormatted(alerts, globalOptions);
  }));

const deleteAllAlertsCommand = new Command('delete-all')
  .description('Delete all alerts for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(deleteAllAlertsCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteExperimentAlerts(id);
    console.log(chalk.green(`✓ All alerts deleted for experiment ${id}`));
  }));

alertsCommand.addCommand(listAlertsCommand);
alertsCommand.addCommand(deleteAllAlertsCommand);
