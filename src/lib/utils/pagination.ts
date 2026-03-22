import chalk from 'chalk';
import type { Command } from 'commander';

export function addPaginationOptions(command: Command, defaultItems = 20): Command {
  return command
    .option('--items <number>', 'results per page', (v: string) => parseInt(v, 10), defaultItems)
    .option('--page <number>', 'page number', (v: string) => parseInt(v, 10), 1);
}

export function printPaginationFooter(count: number, items: number, page: number): void {
  const hasMore = count >= items;
  const footer = hasMore
    ? `Page ${page} (${count} results). Next: --page ${page + 1}`
    : `Page ${page} (${count} results).`;
  console.log(chalk.gray(footer));
}
