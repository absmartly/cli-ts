import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { estimateParticipants } from '../../core/experiments/estimate-participants.js';

function formatTimestampMs(ms: number): string {
  if (ms === 0) return 'N/A';
  return new Date(ms).toLocaleString();
}

export const estimateParticipantsCommand = new Command('estimate-participants')
  .description('Estimate maximum participants for an experiment')
  .requiredOption('--unit-type <nameOrId>', 'unit type name or ID')
  .option('--application <nameOrId>', 'application name or ID (repeatable)', (val: string, prev: string[]) => [...prev, val], [] as string[])
  .option('--from <date>', 'start of observation window (default: 30d ago; accepts relative dates, ISO 8601, or ms epoch)', '30d')
  .option('--audience <json>', 'audience filter as JSON string')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(estimateParticipantsCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const result = await estimateParticipants(client, {
      unitType: options.unitType,
      application: options.application,
      from: options.from,
      audience: options.audience,
    });

    if (globalOptions.output === 'json' || globalOptions.output === 'yaml') {
      printFormatted(result.data.raw, globalOptions);
      return;
    }

    if (result.data.rows.length === 0) {
      console.log(chalk.yellow('No data returned for the given parameters.'));
      return;
    }

    if (result.warnings?.length) {
      for (const w of result.warnings) {
        console.log(chalk.yellow(`Warning: ${w}. Use -o json to inspect the raw response.`));
      }
    }

    for (let i = 0; i < result.data.rows.length; i++) {
      const row = result.data.rows[i]!;

      if (result.data.rows.length > 1) console.log(chalk.bold(`Row ${i + 1}:`));

      if (row.unitCount !== undefined) {
        console.log(chalk.green(`  Estimated max participants: ${row.unitCount.toLocaleString()}`));
      }
      if (row.firstExposure !== undefined) console.log(`  First exposure: ${formatTimestampMs(row.firstExposure)}`);
      if (row.lastExposure !== undefined)  console.log(`  Last exposure:  ${formatTimestampMs(row.lastExposure)}`);
    }

    console.log(`  Window from:    ${formatTimestampMs(result.data.fromTimestamp)}`);
  }));
