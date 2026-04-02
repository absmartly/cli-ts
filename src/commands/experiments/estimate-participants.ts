import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseDateFlag } from '../../lib/utils/date-parser.js';
import { resolveByName } from '../../api-client/payload/resolver.js';

function formatTimestampMs(ms: number): string {
  if (!ms) return 'N/A';
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

    if (applicationNamesOrIds.length === 0) {
      throw new Error('At least one --application <nameOrId> is required');
    }

    const [applications, unitTypes] = await Promise.all([
      client.listApplications(),
      client.listUnitTypes(),
    ]);

    const unitType = resolveByName(unitTypes, options.unitType, 'Unit type');
    const applicationIds = applicationNamesOrIds.map((nameOrId) => resolveByName(applications, nameOrId, 'Application').id);

    const params: {
      from: number;
      unit_type_id: number;
      applications: number[];
      audience?: string;
    } = {
      from,
      unit_type_id: unitType.id,
      applications: applicationIds,
    };

    if (options.audience) {
      params.audience = options.audience;
    }

    const result = await client.estimateMaxParticipants(params);

    if (globalOptions.output === 'json' || globalOptions.output === 'yaml') {
      printFormatted(result, globalOptions);
      return;
    }

    const colIndex = (name: string) => result.columnNames.indexOf(name);
    const unitCountIdx = colIndex('unit_count');
    const firstExposureIdx = colIndex('first_exposure_at');
    const lastExposureIdx = colIndex('last_exposure_at');

    if (result.rows.length === 0) {
      console.log(chalk.yellow('No data returned for the given parameters.'));
      return;
    }

    const row = result.rows[0]!;
    const unitCount = unitCountIdx >= 0 ? (row[unitCountIdx] as number) : undefined;
    const firstExposure = firstExposureIdx >= 0 ? (row[firstExposureIdx] as number) : undefined;
    const lastExposure = lastExposureIdx >= 0 ? (row[lastExposureIdx] as number) : undefined;

    if (unitCount !== undefined) {
      console.log(chalk.green(`Estimated max participants: ${unitCount.toLocaleString()}`));
    }
    if (firstExposure) console.log(`  First exposure: ${formatTimestampMs(firstExposure)}`);
    if (lastExposure) console.log(`  Last exposure:  ${formatTimestampMs(lastExposure)}`);
    console.log(`  Window from:    ${formatTimestampMs(from)}`);
  }));
