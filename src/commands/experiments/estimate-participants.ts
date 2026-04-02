import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseDateFlag } from '../../lib/utils/date-parser.js';
import { resolveByName } from '../../api-client/payload/resolver.js';

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

    const from = parseDateFlag(options.from);
    const applicationNamesOrIds: string[] = options.application;

    if (options.audience) {
      try {
        JSON.parse(options.audience);
      } catch {
        throw new Error(
          `Invalid JSON in --audience: ${options.audience}\n` +
          `Expected valid JSON, e.g.: --audience '{"filter":{"and":[...]}}'`
        );
      }
    }

    const needsApplications = applicationNamesOrIds.length > 0;
    const [applications, unitTypes] = await Promise.all([
      needsApplications ? client.listApplications() : Promise.resolve([]),
      client.listUnitTypes(),
    ]);

    const unitType = resolveByName(unitTypes, options.unitType, 'Unit type');
    const applicationIds = applicationNamesOrIds.map((nameOrId) => resolveByName(applications, nameOrId, 'Application').id);

    const params: {
      from: number;
      unit_type_id: number;
      applications?: number[];
      audience?: string;
    } = {
      from,
      unit_type_id: unitType.id,
    };

    if (applicationIds.length > 0) params.applications = applicationIds;
    if (options.audience) params.audience = options.audience;

    const result = await client.estimateMaxParticipants(params);

    if (globalOptions.output === 'json' || globalOptions.output === 'yaml') {
      printFormatted(result, globalOptions);
      return;
    }

    if (result.rows.length === 0) {
      console.log(chalk.yellow('No data returned for the given parameters.'));
      return;
    }

    const colIndex = (name: string) => result.columnNames.indexOf(name);
    const unitCountIdx = colIndex('unit_count');
    const firstExposureIdx = colIndex('first_exposure_at');
    const lastExposureIdx = colIndex('last_exposure_at');

    if (unitCountIdx < 0) {
      console.log(chalk.yellow('Warning: "unit_count" not present in API response. Use -o json to inspect the raw response.'));
    }

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i]!;

      if (result.rows.length > 1) console.log(chalk.bold(`Row ${i + 1}:`));

      if (unitCountIdx >= 0) {
        console.log(chalk.green(`  Estimated max participants: ${(row[unitCountIdx] as number).toLocaleString()}`));
      }
      if (firstExposureIdx >= 0) console.log(`  First exposure: ${formatTimestampMs(row[firstExposureIdx] as number)}`);
      if (lastExposureIdx >= 0)  console.log(`  Last exposure:  ${formatTimestampMs(row[lastExposureIdx] as number)}`);
    }

    console.log(`  Window from:    ${formatTimestampMs(from)}`);
  }));
