import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  shouldOutputIdsOnly,
  withErrorHandling,
} from './api-helper.js';
import { addPaginationOptions, printPaginationFooter, printFilteredFooter } from './pagination.js';
import { applyShowExclude } from '../../api-client/entity-summary.js';
import type { APIClient } from '../../api-client/api-client.js';

export interface ListCommandOptions {
  description: string;
  defaultItems?: number;
  fetch: (client: APIClient, options: Record<string, unknown>) => Promise<unknown[]>;
  summarizeRow?: (item: Record<string, unknown>) => Record<string, unknown>;
  extraOptions?: (cmd: Command) => Command;
  /**
   * When this returns true for the parsed options, `fetch` is expected to have
   * already returned the COMPLETE client-filtered result set, so a total-count
   * footer is printed instead of the page-based pagination footer.
   */
  isClientFiltered?: (options: Record<string, unknown>) => boolean;
}

export function createListCommand(opts: ListCommandOptions): Command {
  let cmd = new Command('list').description(opts.description);

  if (opts.extraOptions) cmd = opts.extraOptions(cmd);

  cmd = addPaginationOptions(cmd, opts.defaultItems ?? 20)
    .option('--search <query>', 'search by name or description')
    .option('--sort <field>', 'sort by field (e.g. name, created_at)')
    .option('--asc', 'sort in ascending order')
    .option('--desc', 'sort in descending order')
    .option('--archived', 'include archived items')
    .option('--ids <ids>', 'filter by IDs (comma-separated)')
    .option('--show <fields...>', 'include additional fields from API response')
    .option('--exclude <fields...>', 'hide fields from summary')
    .option(
      '--show-only <fields...>',
      'show only these fields (mutually exclusive with --show and --exclude)'
    );

  cmd.action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(cmd);
      const client = await getAPIClientFromOptions(globalOptions);
      const show = (options.show as string[] | undefined) ?? [];
      const exclude = (options.exclude as string[] | undefined) ?? [];
      const showOnly = options.showOnly as string[] | undefined;
      if (showOnly && (show.length > 0 || exclude.length > 0)) {
        throw new Error('--show-only is mutually exclusive with --show and --exclude');
      }

      const items = await opts.fetch(client, options);

      if (shouldOutputIdsOnly(globalOptions)) {
        for (const item of items) console.log((item as Record<string, unknown>).id);
        return;
      }

      let data: unknown;
      if (globalOptions.raw || !opts.summarizeRow) {
        data = items;
      } else {
        data = (items as Array<Record<string, unknown>>).map((item) =>
          applyShowExclude(opts.summarizeRow!(item), item, show, exclude, showOnly)
        );
      }

      printFormatted(data, globalOptions);
      if (opts.isClientFiltered?.(options)) {
        printFilteredFooter(items.length, globalOptions.output as string);
      } else {
        printPaginationFooter(
          items.length,
          options.items,
          options.page,
          globalOptions.output as string
        );
      }
    })
  );

  return cmd;
}
