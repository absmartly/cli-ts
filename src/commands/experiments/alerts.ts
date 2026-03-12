import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseAlertId } from '../../lib/utils/validators.js';
import type { ExperimentId, AlertId } from '../../lib/api/branded-types.js';

export const alertsCommand = new Command('alerts').description('Experiment alert operations');

const listAlertsCommand = new Command('list')
  .description('List alerts for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (experimentId: ExperimentId) => {
    const globalOptions = getGlobalOptions(listAlertsCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const alerts = await client.listExperimentAlerts(experimentId);

    if (alerts.length === 0) {
      console.log(chalk.blue('ℹ No alerts found'));
      return;
    }

    printFormatted(alerts, globalOptions);
  }));

const dismissAlertCommand = new Command('dismiss')
  .description('Dismiss an alert')
  .argument('<alertId>', 'alert ID', parseAlertId)
  .action(withErrorHandling(async (alertId: AlertId) => {
    const globalOptions = getGlobalOptions(dismissAlertCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.dismissAlert(alertId);
    console.log(chalk.green(`✓ Alert ${alertId} dismissed`));
  }));

alertsCommand.addCommand(listAlertsCommand);
alertsCommand.addCommand(dismissAlertCommand);
