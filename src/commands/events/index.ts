import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import {
  columnarToRows,
  listEvents as coreListEvents,
  listEventsHistory as coreListEventsHistory,
  getEventUnitData as coreGetEventUnitData,
  deleteEventUnitData as coreDeleteEventUnitData,
  getEventJsonValues as coreGetEventJsonValues,
  getEventJsonLayouts as coreGetEventJsonLayouts,
  parseUnits,
} from '../../core/events/events.js';

function parseNumberArray(value: string, previous: number[]): number[] {
  return [...previous, Number(value)];
}

function parseStringArray(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export const eventsCommand = new Command('events')
  .aliases(['event'])
  .description('Event management');

const listCommand = new Command('list')
  .description('List events')
  .option('--from <date>', 'start time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .option('--to <date>', 'end time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .option('--app <id>', 'application ID (repeatable)', parseNumberArray, [])
  .option('--unit-type <id>', 'unit type ID (repeatable)', parseNumberArray, [])
  .option(
    '--event-type <type>',
    'event type e.g. exposure, goal (repeatable)',
    parseStringArray,
    []
  )
  .option('--event-name <name>', 'event/experiment name (repeatable)', parseStringArray, [])
  .option('--unit-uid <uid>', 'unit UID (repeatable)', parseStringArray, [])
  .option(
    '--env-type <type>',
    'environment type e.g. production, development (repeatable)',
    parseStringArray,
    []
  )
  .option('--effective-exposures', 'only effective exposures')
  .option('--items <count>', 'number of items to take', Number)
  .option('--skip <count>', 'number of items to skip', Number)
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const fromTs = parseDateFlagOrUndefined(options.from);
      const toTs = parseDateFlagOrUndefined(options.to);

      const result = await coreListEvents(client, {
        from: fromTs,
        to: toTs,
        applications: options.app.length > 0 ? options.app : undefined,
        unitTypes: options.unitType.length > 0 ? options.unitType : undefined,
        eventTypes: options.eventType.length > 0 ? options.eventType : undefined,
        eventNames: options.eventName.length > 0 ? options.eventName : undefined,
        unitUids: options.unitUid.length > 0 ? options.unitUid : undefined,
        environmentTypes: options.envType.length > 0 ? options.envType : undefined,
        effectiveExposures: options.effectiveExposures || undefined,
        take: options.items,
        skip: options.skip,
      });
      printFormatted(globalOptions.raw ? result.data : columnarToRows(result.data), globalOptions);
    })
  );

const historyCommand = new Command('history')
  .description('List events history')
  .option('--from <date>', 'start time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .option('--to <date>', 'end time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .option('--app <id>', 'application ID (repeatable)', parseNumberArray, [])
  .option('--unit-type <id>', 'unit type ID (repeatable)', parseNumberArray, [])
  .option(
    '--event-type <type>',
    'event type e.g. exposure, goal (repeatable)',
    parseStringArray,
    []
  )
  .option('--event-name <name>', 'event/experiment name (repeatable)', parseStringArray, [])
  .option('--unit-uid <uid>', 'unit UID (repeatable)', parseStringArray, [])
  .option(
    '--env-type <type>',
    'environment type e.g. production, development (repeatable)',
    parseStringArray,
    []
  )
  .option('--period <period>', 'aggregation period')
  .option('--tz-offset <offset>', 'timezone offset in minutes', Number)
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(historyCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const fromTs = parseDateFlagOrUndefined(options.from);
      const toTs = parseDateFlagOrUndefined(options.to);

      const result = await coreListEventsHistory(client, {
        from: fromTs,
        to: toTs,
        applications: options.app.length > 0 ? options.app : undefined,
        unitTypes: options.unitType.length > 0 ? options.unitType : undefined,
        eventTypes: options.eventType.length > 0 ? options.eventType : undefined,
        eventNames: options.eventName.length > 0 ? options.eventName : undefined,
        unitUids: options.unitUid.length > 0 ? options.unitUid : undefined,
        environmentTypes: options.envType.length > 0 ? options.envType : undefined,
        period: options.period,
        tzOffset: options.tzOffset,
      });
      printFormatted(globalOptions.raw ? result.data : columnarToRows(result.data), globalOptions);
    })
  );

const unitDataCommand = new Command('unit-data')
  .description('Get event unit data')
  .argument('<units...>', 'units in format unit_type_id:uid')
  .action(
    withErrorHandling(async (units: string[]) => {
      const globalOptions = getGlobalOptions(unitDataCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await coreGetEventUnitData(client, { units });
      printFormatted(result.data, globalOptions);
    })
  );

const deleteUnitDataCommand = new Command('delete-unit-data')
  .description('Delete event unit data')
  .argument('<units...>', 'units in format unit_type_id:uid')
  .action(
    withErrorHandling(async (units: string[]) => {
      const globalOptions = getGlobalOptions(deleteUnitDataCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const parsed = parseUnits(units);
      const result = await coreDeleteEventUnitData(client, { units });
      console.log(chalk.green(`✓ Unit data deleted for ${parsed.length} unit(s)`));
      if (result.data) {
        printFormatted(result.data, globalOptions);
      }
    })
  );

const jsonValuesCommand = new Command('json-values')
  .description('Get event JSON values')
  .requiredOption('--event-type <type>', 'event type (exposure|goal|attribute)')
  .requiredOption('--path <path>', 'JSON path')
  .option('--experiment-id <id>', 'experiment ID', Number)
  .option('--goal-id <id>', 'goal ID', Number)
  .option('--from <date>', 'start time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .option('--to <date>', 'end time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(jsonValuesCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const jvFrom = parseDateFlagOrUndefined(options.from);
      const jvTo = parseDateFlagOrUndefined(options.to);

      const result = await coreGetEventJsonValues(client, {
        eventType: options.eventType,
        path: options.path,
        experimentId: options.experimentId,
        goalId: options.goalId,
        from: jvFrom,
        to: jvTo,
      });
      printFormatted(result.data, globalOptions);
    })
  );

const jsonLayoutsCommand = new Command('json-layouts')
  .description('Get event JSON layouts')
  .requiredOption('--source <source>', 'source (unit_attribute|unit_goal_property)')
  .requiredOption('--phase <phase>', 'phase (before_enrichment|after_enrichment)')
  .option('--prefix <prefix>', 'path prefix')
  .option('--source-id <id>', 'source ID', Number)
  .option('--from <date>', 'start time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .option('--to <date>', 'end time (e.g. 7d, 2w, 2026-01-01, epoch ms)')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(jsonLayoutsCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const jlFrom = parseDateFlagOrUndefined(options.from);
      const jlTo = parseDateFlagOrUndefined(options.to);

      const result = await coreGetEventJsonLayouts(client, {
        source: options.source,
        phase: options.phase,
        prefix: options.prefix,
        sourceId: options.sourceId,
        from: jlFrom,
        to: jlTo,
      });
      printFormatted(result.data, globalOptions);
    })
  );

eventsCommand.addCommand(listCommand);
eventsCommand.addCommand(historyCommand);
eventsCommand.addCommand(unitDataCommand);
eventsCommand.addCommand(deleteUnitDataCommand);
eventsCommand.addCommand(jsonValuesCommand);
eventsCommand.addCommand(jsonLayoutsCommand);
