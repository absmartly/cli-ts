import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const insightsCommand = new Command('insights')
  .alias('insight')
  .description('Insights commands');

function toEpochSeconds(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

const velocityCommand = new Command('velocity')
  .description('Get velocity insights')
  .requiredOption('--from <date>', 'start date (ISO 8601, e.g. 2026-01-01)')
  .requiredOption('--to <date>', 'end date (ISO 8601, e.g. 2026-03-01)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--unit-types <ids>', 'comma-separated unit type IDs')
  .option('--teams <ids>', 'comma-separated team IDs')
  .option('--owners <ids>', 'comma-separated owner IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(velocityCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await client.getVelocityInsights({
      from: toEpochSeconds(options.from),
      to: toEpochSeconds(options.to),
      aggregation: options.aggregation,
      unit_type_ids: options.unitTypes?.split(',').map((s: string) => parseInt(s.trim(), 10)),
      team_ids: options.teams?.split(',').map((s: string) => parseInt(s.trim(), 10)),
      owner_ids: options.owners?.split(',').map((s: string) => parseInt(s.trim(), 10)),
    });
    printFormatted(result, globalOptions);
  }));

const decisionsCommand = new Command('decisions')
  .description('Get decision insights')
  .requiredOption('--from <date>', 'start date (ISO 8601, e.g. 2026-01-01)')
  .requiredOption('--to <date>', 'end date (ISO 8601, e.g. 2026-03-01)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--unit-types <ids>', 'comma-separated unit type IDs')
  .option('--teams <ids>', 'comma-separated team IDs')
  .option('--owners <ids>', 'comma-separated owner IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(decisionsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await client.getDecisionInsights({
      from: toEpochSeconds(options.from),
      to: toEpochSeconds(options.to),
      aggregation: options.aggregation,
      unit_type_ids: options.unitTypes?.split(',').map((s: string) => parseInt(s.trim(), 10)),
      team_ids: options.teams?.split(',').map((s: string) => parseInt(s.trim(), 10)),
      owner_ids: options.owners?.split(',').map((s: string) => parseInt(s.trim(), 10)),
    });
    printFormatted(result, globalOptions);
  }));

const velocityDetailCommand = new Command('velocity-detail')
  .description('Get detailed velocity insights breakdown')
  .requiredOption('--from <date>', 'start date (ISO 8601)')
  .requiredOption('--to <date>', 'end date (ISO 8601)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--teams <ids>', 'comma-separated team IDs')
  .option('--applications <ids>', 'comma-separated application IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(velocityDetailCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await client.getVelocityInsightsDetail({
      from: toEpochSeconds(options.from),
      to: toEpochSeconds(options.to),
      aggregation: options.aggregation,
      teams: options.teams,
      applications: options.applications,
    });
    printFormatted(result, globalOptions);
  }));

const decisionsHistoryCommand = new Command('decisions-history')
  .description('Get decision insights history')
  .requiredOption('--from <date>', 'start date (ISO 8601)')
  .requiredOption('--to <date>', 'end date (ISO 8601)')
  .requiredOption('--aggregation <agg>', 'aggregation period (month, week, day)')
  .option('--teams <ids>', 'comma-separated team IDs')
  .option('--applications <ids>', 'comma-separated application IDs')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(decisionsHistoryCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await client.getDecisionInsightsHistory({
      from: toEpochSeconds(options.from),
      to: toEpochSeconds(options.to),
      aggregation: options.aggregation,
      teams: options.teams,
      applications: options.applications,
    });
    printFormatted(result, globalOptions);
  }));

insightsCommand.addCommand(velocityCommand);
insightsCommand.addCommand(decisionsCommand);
insightsCommand.addCommand(velocityDetailCommand);
insightsCommand.addCommand(decisionsHistoryCommand);
