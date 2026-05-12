import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  AggregatedRow,
  EventTypeFilter,
  Period,
  SummaryTeam,
} from '../../core/events/summary.js';

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
