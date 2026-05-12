import chalk from 'chalk';
import { Command, Option } from 'commander';
import Table from 'cli-table3';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import {
  aggregateByTeam,
  applyCumulative,
  getEventsSummary as coreGetEventsSummary,
  rollUpEvents,
} from '../../core/events/summary.js';
import type {
  AggregatedRow,
  EventTypeFilter,
  Period,
  SummaryTeam,
} from '../../core/events/summary.js';

const UNOWNED_TEAM: SummaryTeam = { id: -1, name: 'Unowned', initials: 'UN', color: 'gray' };

export interface FormatOptions {
  period: Period;
  groupBy: 'team' | 'total';
  eventType: EventTypeFilter;
  noColor: boolean;
}

function formatPeriodCell(date: number, period: Period): string {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  if (period === 'month') return `${y}-${m}`;
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pickCount(
  row: { goal: number; exposure: number; total: number } | undefined,
  eventType: EventTypeFilter
): number {
  if (!row) return 0;
  if (eventType === 'goal') return row.goal;
  if (eventType === 'exposure') return row.exposure;
  return row.total;
}

function pickRowTotal(row: AggregatedRow, eventType: EventTypeFilter): number {
  if (eventType === 'goal') return row.totalGoal;
  if (eventType === 'exposure') return row.totalExposure;
  return row.total;
}

export function formatSummaryTable(
  rows: AggregatedRow[],
  teams: SummaryTeam[],
  options: FormatOptions
): string {
  const head: string[] = [options.period === 'month' ? 'Month' : options.period === 'week' ? 'Week' : 'Date'];
  if (options.groupBy === 'team') {
    for (const t of teams) head.push(t.name);
  }
  head.push('Total');

  const table = new Table({
    head: options.noColor ? head : head.map((h) => chalk.cyan(h)),
    style: { head: [], border: options.noColor ? [] : ['gray'] },
    colAligns: ['left', ...head.slice(1).map(() => 'right' as const)],
  });

  for (const row of rows) {
    const cells: (string | number)[] = [formatPeriodCell(row.date, options.period)];
    if (options.groupBy === 'team') {
      for (const t of teams) {
        cells.push(pickCount(row.teams.get(t.id), options.eventType).toLocaleString());
      }
    }
    cells.push(pickRowTotal(row, options.eventType).toLocaleString());
    table.push(cells);
  }
  return table.toString();
}

export function formatSummaryBars(
  rows: AggregatedRow[],
  teams: SummaryTeam[],
  options: FormatOptions
): string {
  const BAR_WIDTH = 40;
  const periodWidth = options.period === 'month' ? 7 : 10;
  const teamWidth = Math.max(...teams.map((t) => t.name.length), 'Total'.length);

  const values: number[] = [];
  for (const row of rows) {
    if (options.groupBy === 'team') {
      for (const t of teams) values.push(pickCount(row.teams.get(t.id), options.eventType));
    } else {
      values.push(pickRowTotal(row, options.eventType));
    }
  }
  const max = Math.max(1, ...values);

  const lines: string[] = [];
  for (const row of rows) {
    const period = formatPeriodCell(row.date, options.period).padEnd(periodWidth);
    if (options.groupBy === 'team') {
      for (const t of teams) {
        const count = pickCount(row.teams.get(t.id), options.eventType);
        if (count === 0) continue;
        const barLen = Math.max(1, Math.round((count / max) * BAR_WIDTH));
        const bar = '█'.repeat(barLen);
        const teamLabel = t.name.padEnd(teamWidth);
        const colored = options.noColor ? bar : chalk.cyan(bar);
        lines.push(`${period}  ${teamLabel}  ${colored}  ${count.toLocaleString()}`);
      }
    } else {
      const count = pickRowTotal(row, options.eventType);
      const barLen = Math.max(1, Math.round((count / max) * BAR_WIDTH));
      const bar = '█'.repeat(barLen);
      const colored = options.noColor ? bar : chalk.cyan(bar);
      lines.push(`${period}  ${'Total'.padEnd(teamWidth)}  ${colored}  ${count.toLocaleString()}`);
    }
  }
  return lines.join('\n');
}

export const summaryCommand = new Command('summary')
  .description('Summary of exposures and goal events grouped by team and period')
  .option('--from <date>', 'start time (e.g. 7d, month-start, 2026-05-01, epoch ms)')
  .option('--to <date>', 'end time (e.g. now, last-month-end, 2026-05-31, epoch ms)')
  .addOption(
    new Option('--event-type <type>', 'event type to include')
      .choices(['all', 'goal', 'exposure'])
      .default('all')
  )
  .addOption(
    new Option('--group-by <mode>', 'grouping for the output')
      .choices(['team', 'total'])
      .default('total')
  )
  .addOption(
    new Option('--period <p>', 'client-side rollup bucket')
      .choices(['day', 'week', 'month'])
      .default('week')
  )
  .option('--cumulative', 'show running totals across periods')
  .addOption(
    new Option('--visualization <v>', 'output style')
      .choices(['table', 'bar'])
      .default('table')
  )
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(summaryCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const from = parseDateFlagOrUndefined(options.from);
      const to = parseDateFlagOrUndefined(options.to);

      const result = await coreGetEventsSummary(client, { from, to });

      if (globalOptions.raw || globalOptions.output === 'json' || globalOptions.output === 'yaml') {
        printFormatted(result.data, globalOptions);
        return;
      }

      const period = options.period as Period;
      const eventType = options.eventType as EventTypeFilter;
      const groupBy = options.groupBy as 'team' | 'total';
      const visualization = options.visualization as 'table' | 'bar';

      const teamsWithUnowned: SummaryTeam[] = [...result.data.teams, UNOWNED_TEAM];
      const usedTeamIds = new Set(result.data.events.map((e) => e.team_id));
      const teams = teamsWithUnowned.filter((t) => usedTeamIds.has(t.id));

      const rolled = rollUpEvents(result.data.events, period);
      const aggregated = aggregateByTeam(rolled, { eventType });
      const finalRows = options.cumulative ? applyCumulative(aggregated) : aggregated;

      const formatOpts = {
        period,
        groupBy,
        eventType,
        noColor: globalOptions.noColor ?? false,
      };

      const out =
        visualization === 'bar'
          ? formatSummaryBars(finalRows, teams, formatOpts)
          : formatSummaryTable(finalRows, teams, formatOpts);
      console.log(out);
    })
  );
