import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

function parseUnits(units: string[]): Array<{ unit_type_id: number; uid: string }> {
  const parsed: Array<{ unit_type_id: number; uid: string }> = [];
  for (const unit of units) {
    const colonIndex = unit.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid unit format: "${unit}". Expected format: unit_type_id:uid`);
    }
    const unitTypeId = Number(unit.slice(0, colonIndex));
    const uid = unit.slice(colonIndex + 1);
    if (isNaN(unitTypeId)) {
      throw new Error(`Invalid unit_type_id in "${unit}". Must be a number.`);
    }
    parsed.push({ unit_type_id: unitTypeId, uid });
  }
  return parsed;
}

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
  .option('--from <epoch>', 'start time in epoch ms', Number)
  .option('--to <epoch>', 'end time in epoch ms', Number)
  .option('--app <id>', 'application ID (repeatable)', parseNumberArray, [])
  .option('--unit-type <id>', 'unit type ID (repeatable)', parseNumberArray, [])
  .option('--event-type <type>', 'event type (repeatable)', parseStringArray, [])
  .option('--items <count>', 'number of items to take', Number)
  .option('--skip <count>', 'number of items to skip', Number)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const filters: Record<string, unknown> = {};
    if (options.from !== undefined) filters.from = options.from;
    if (options.to !== undefined) filters.to = options.to;
    if (options.app.length > 0) filters.applications = options.app;
    if (options.unitType.length > 0) filters.unit_types = options.unitType;
    if (options.eventType.length > 0) filters.event_types = options.eventType;

    const body: Record<string, unknown> = {};
    if (Object.keys(filters).length > 0) body.filters = filters;
    if (options.items !== undefined) body.take = options.items;
    if (options.skip !== undefined) body.skip = options.skip;

    const result = await client.listEvents(body as Parameters<typeof client.listEvents>[0]);
    printFormatted(result, globalOptions);
  }));

const historyCommand = new Command('history')
  .description('List events history')
  .option('--from <epoch>', 'start time in epoch ms', Number)
  .option('--to <epoch>', 'end time in epoch ms', Number)
  .option('--period <period>', 'aggregation period')
  .option('--tz-offset <offset>', 'timezone offset in minutes', Number)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(historyCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const filters: Record<string, unknown> = {};
    if (options.from !== undefined) filters.from = options.from;
    if (options.to !== undefined) filters.to = options.to;

    const body: Record<string, unknown> = {};
    if (Object.keys(filters).length > 0) body.filters = filters;
    if (options.period !== undefined) body.period = options.period;
    if (options.tzOffset !== undefined) body.tz_offset = options.tzOffset;

    const result = await client.listEventsHistory(body as Parameters<typeof client.listEventsHistory>[0]);
    printFormatted(result, globalOptions);
  }));

const unitDataCommand = new Command('unit-data')
  .description('Get event unit data')
  .argument('<units...>', 'units in format unit_type_id:uid')
  .action(withErrorHandling(async (units: string[]) => {
    const globalOptions = getGlobalOptions(unitDataCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const parsed = parseUnits(units);
    const result = await client.getEventUnitData({ units: parsed });
    printFormatted(result, globalOptions);
  }));

const deleteUnitDataCommand = new Command('delete-unit-data')
  .description('Delete event unit data')
  .argument('<units...>', 'units in format unit_type_id:uid')
  .action(withErrorHandling(async (units: string[]) => {
    const globalOptions = getGlobalOptions(deleteUnitDataCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const parsed = parseUnits(units);
    const result = await client.deleteEventUnitData({ units: parsed });
    console.log(chalk.green(`✓ Unit data deleted for ${parsed.length} unit(s)`));
    if (result) {
      printFormatted(result, globalOptions);
    }
  }));

const jsonValuesCommand = new Command('json-values')
  .description('Get event JSON values')
  .requiredOption('--event-type <type>', 'event type (exposure|goal|attribute)')
  .requiredOption('--path <path>', 'JSON path')
  .option('--experiment-id <id>', 'experiment ID', Number)
  .option('--goal-id <id>', 'goal ID', Number)
  .option('--from <epoch>', 'start time in epoch ms', Number)
  .option('--to <epoch>', 'end time in epoch ms', Number)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(jsonValuesCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const body: Record<string, unknown> = {
      event_type: options.eventType,
      path: options.path,
    };
    if (options.experimentId !== undefined) body.experiment_id = options.experimentId;
    if (options.goalId !== undefined) body.goal_id = options.goalId;
    if (options.from !== undefined) body.from = options.from;
    if (options.to !== undefined) body.to = options.to;

    const result = await client.getEventJsonValues(body as Parameters<typeof client.getEventJsonValues>[0]);
    printFormatted(result, globalOptions);
  }));

const jsonLayoutsCommand = new Command('json-layouts')
  .description('Get event JSON layouts')
  .requiredOption('--source <source>', 'source (unit_attribute|unit_goal_property)')
  .requiredOption('--phase <phase>', 'phase (before_enrichment|after_enrichment)')
  .option('--prefix <prefix>', 'path prefix')
  .option('--source-id <id>', 'source ID', Number)
  .option('--from <epoch>', 'start time in epoch ms', Number)
  .option('--to <epoch>', 'end time in epoch ms', Number)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(jsonLayoutsCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const body: Record<string, unknown> = {
      source: options.source,
      phase: options.phase,
    };
    if (options.prefix !== undefined) body.prefix = options.prefix;
    if (options.sourceId !== undefined) body.source_id = options.sourceId;
    if (options.from !== undefined) body.from = options.from;
    if (options.to !== undefined) body.to = options.to;

    const result = await client.getEventJsonLayouts(body as Parameters<typeof client.getEventJsonLayouts>[0]);
    printFormatted(result, globalOptions);
  }));

eventsCommand.addCommand(listCommand);
eventsCommand.addCommand(historyCommand);
eventsCommand.addCommand(unitDataCommand);
eventsCommand.addCommand(deleteUnitDataCommand);
eventsCommand.addCommand(jsonValuesCommand);
eventsCommand.addCommand(jsonLayoutsCommand);
