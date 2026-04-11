import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from './api-helper.js';
import { isStdoutPiped } from './stdin.js';
import { addPaginationOptions, printPaginationFooter } from './pagination.js';
import { applyShowExclude } from '../../api-client/entity-summary.js';
import type { APIClient } from '../../api-client/api-client.js';

export interface ListCommandOptions {
  description: string;
  defaultItems?: number;
  fetch: (client: APIClient, options: Record<string, unknown>) => Promise<unknown[]>;
  summarizeRow?: (item: Record<string, unknown>) => Record<string, unknown>;
  extraOptions?: (cmd: Command) => Command;
}

export function createListCommand(opts: ListCommandOptions): Command {
  let cmd = new Command('list').description(opts.description);

  if (opts.extraOptions) cmd = opts.extraOptions(cmd);

  cmd = addPaginationOptions(cmd, opts.defaultItems ?? 20)
    .option('--show <fields...>', 'include additional fields from API response')
    .option('--exclude <fields...>', 'hide fields from summary');

  cmd.action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(cmd);
      const client = await getAPIClientFromOptions(globalOptions);
      const show = (options.show as string[] | undefined) ?? [];
      const exclude = (options.exclude as string[] | undefined) ?? [];

      const items = await opts.fetch(client, options);

      if (isStdoutPiped() && globalOptions.output === 'table') {
        for (const item of items) console.log((item as Record<string, unknown>).id);
        return;
      }

      let data: unknown;
      if (globalOptions.raw || !opts.summarizeRow) {
        data = items;
      } else {
        data = (items as Array<Record<string, unknown>>).map((item) =>
          applyShowExclude(opts.summarizeRow!(item), item, show, exclude)
        );
      }

      printFormatted(data, globalOptions);
      printPaginationFooter(
        items.length,
        options.items,
        options.page,
        globalOptions.output as string
      );
    })
  );

  return cmd;
}
