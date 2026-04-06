import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import {
  getVelocityInsights as coreGetVelocityInsights,
  getDecisionInsights as coreGetDecisionInsights,
  getVelocityInsightsDetail as coreGetVelocityInsightsDetail,
  getDecisionInsightsHistory as coreGetDecisionInsightsHistory,
} from '../../core/insights/insights.js';

export const insightsCommand = new Command('insights')
  .alias('insight')
  .description('Insights commands');

const velocityCommand = new Command('velocity')
  .description('Get velocity insights')
  .requiredOption('--from <date>', 'start date (ISO 8601, e.g. 2026-01-01)')
  .requiredOption('--to <date>', 'end date (ISO 8601, e.g. 2026-03-01)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--unit-types <values>', 'comma-separated unit type names or IDs')
  .option('--teams <values>', 'comma-separated team names or IDs')
  .option('--owners <values>', 'comma-separated owner names, emails, or IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(velocityCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await coreGetVelocityInsights(client, {
      from: options.from,
      to: options.to,
      aggregation: options.aggregation,
      unitTypes: options.unitTypes,
      teams: options.teams,
      owners: options.owners,
    });
    printFormatted(result.data, globalOptions);
  }));

const decisionsCommand = new Command('decisions')
  .description('Get decision insights')
  .requiredOption('--from <date>', 'start date (ISO 8601, e.g. 2026-01-01)')
  .requiredOption('--to <date>', 'end date (ISO 8601, e.g. 2026-03-01)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--unit-types <values>', 'comma-separated unit type names or IDs')
  .option('--teams <values>', 'comma-separated team names or IDs')
  .option('--owners <values>', 'comma-separated owner names, emails, or IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(decisionsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await coreGetDecisionInsights(client, {
      from: options.from,
      to: options.to,
      aggregation: options.aggregation,
      unitTypes: options.unitTypes,
      teams: options.teams,
      owners: options.owners,
    });
    printFormatted(result.data, globalOptions);
  }));

const velocityDetailCommand = new Command('velocity-detail')
  .description('Get detailed velocity insights breakdown')
  .requiredOption('--from <date>', 'start date (ISO 8601)')
  .requiredOption('--to <date>', 'end date (ISO 8601)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--teams <values>', 'comma-separated team names or IDs')
  .option('--applications <values>', 'comma-separated application names or IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(velocityDetailCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await coreGetVelocityInsightsDetail(client, {
      from: options.from,
      to: options.to,
      aggregation: options.aggregation,
      teams: options.teams,
      applications: options.applications,
    });
    printFormatted(result.data, globalOptions);
  }));

const decisionsHistoryCommand = new Command('decisions-history')
  .description('Get decision insights history')
  .requiredOption('--from <date>', 'start date (ISO 8601)')
  .requiredOption('--to <date>', 'end date (ISO 8601)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--teams <values>', 'comma-separated team names or IDs')
  .option('--applications <values>', 'comma-separated application names or IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(decisionsHistoryCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await coreGetDecisionInsightsHistory(client, {
      from: options.from,
      to: options.to,
      aggregation: options.aggregation,
      teams: options.teams,
      applications: options.applications,
    });
    printFormatted(result.data, globalOptions);
  }));

insightsCommand.addCommand(velocityCommand);
insightsCommand.addCommand(decisionsCommand);
insightsCommand.addCommand(velocityDetailCommand);
insightsCommand.addCommand(decisionsHistoryCommand);
