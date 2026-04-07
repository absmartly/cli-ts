import { Command } from 'commander';
import chalk from 'chalk';
import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { highlight } from 'cli-highlight';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import { startPolling } from '../../lib/utils/polling.js';
import { formatDateTime } from '../../api-client/format-helpers.js';
import {
  listActivity as coreListActivity,
  fetchAllActivity,
  buildLookups,
  resolveMentions,
  formatActivityEntry,
  type NoteLookups,
  type ActivityEntry,
} from '../../core/activity/activity.js';

// Re-export for use by experiments/get.ts
export type { NoteLookups } from '../../core/activity/activity.js';

const terminalMarked = new Marked(markedTerminal({
  code: (code: string, lang: string) => {
    try {
      return highlight(code, { language: lang || 'text', ignoreIllegals: true }) + '\n';
    } catch {
      return chalk.yellow(code) + '\n';
    }
  },
  blockquote: (text: string) => {
    const lines = text.trim().split('\n');
    return lines.map(line => chalk.gray('│ ') + chalk.italic(line.replace(/^ {1,4}/, ''))).join('\n') + '\n';
  },
} as any) as any);

export { resolveMentions };

function parsePositiveIntFlag(value: string, flag: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flag}: "${value}". Expected a positive integer.`);
  }
  return parsed;
}

export function formatNoteText(text: string, lookups: NoteLookups = {}): string {
  const resolved = resolveMentions(text, lookups);
  const rendered = terminalMarked.parse(resolved) as string;
  return rendered
    .replace(/^( *)(\* )/gm, '$1● ')
    .trim();
}

function printActivityEntries(entries: ActivityEntry[], showNotes = false): void {
  if (entries.length === 0) {
    console.log(chalk.blue('No activity found'));
    return;
  }

  for (const entry of entries) {
    const ts = entry.timestamp ? formatDateTime(entry.timestamp) : 'unknown';

    console.log(
      `${chalk.gray(`[${ts}]`)} ${chalk.cyan(`${entry.experimentName}`)} ${chalk.gray(`(id:${entry.experimentId})`)} — ${chalk.white(`${entry.user}: ${entry.action}`)}`
    );

    if (showNotes && entry.noteText) {
      const rendered = terminalMarked.parse(entry.noteText) as string;
      const formatted = rendered.replace(/^( *)(\* )/gm, '$1● ').trim();
      if (formatted) {
        console.log(`  ${chalk.white(`→ ${formatted}`)}`);
      }
    }
  }
}

export const activityFeedCommand = new Command('activity-feed')
  .description('Global activity feed across experiments (scans recent experiments by updated_at)');

const listCommand = new Command('list')
  .description('List recent activity across all experiments')
  .option('--experiments <n>', 'number of experiments to scan for activity', '50')
  .option('--items <n>', 'alias for --experiments')
  .option('--limit <n>', 'max number of activity entries to show', '20')
  .option('--since <date>', 'only show activity after this date (e.g. 7d, 2w, 2026-01-01)')
  .option('--state <state>', 'filter experiments by state')
  .option('--search <query>', 'filter experiments by name')
  .option('--sort <field>', 'sort experiments by (updated_at, created_at)', 'updated_at')
  .option('--notes', 'show note text for each activity entry')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const since = parseDateFlagOrUndefined(options.since);
    const experiments = parsePositiveIntFlag(options.items ?? options.experiments, '--experiments');
    const limit = parsePositiveIntFlag(options.limit, '--limit');

    const result = await coreListActivity(client, {
      experiments,
      limit,
      since,
      state: options.state,
      search: options.search,
      sort: options.sort,
      includeNotes: options.notes,
    });

    printActivityEntries(result.data, options.notes);
    if (result.warnings) {
      for (const w of result.warnings) {
        console.log(chalk.gray(w));
      }
    }
  }));

const watchCommand = new Command('watch')
  .description('Watch activity feed in real-time')
  .option('--interval <seconds>', 'poll interval in seconds', '30')
  .option('--experiments <n>', 'number of experiments to scan', '50')
  .option('--items <n>', 'alias for --experiments')
  .option('--state <state>', 'filter experiments by state')
  .option('--sort <field>', 'sort experiments by (updated_at, created_at)', 'updated_at')
  .option('--notes', 'show note text for each activity entry')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(watchCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const intervalSeconds = parsePositiveIntFlag(options.interval, '--interval');
    const experiments = parsePositiveIntFlag(options.items ?? options.experiments, '--experiments');

    let lastSeenTimestamp: number | undefined;
    const lookups = options.notes ? await buildLookups(client) : {} as NoteLookups;

    console.log(chalk.blue(`Watching activity (polling every ${intervalSeconds}s)... Press Ctrl+C to stop\n`));

    const onTick = async () => {
      const notes = await fetchAllActivity(client, {
        items: experiments,
        state: options.state,
        sort: options.sort,
        since: lastSeenTimestamp,
      });

      if (notes.length > 0) {
        const entries = notes.map(n => formatActivityEntry(n, lookups));
        printActivityEntries(entries, options.notes);

        const newestTimestamp = Math.max(
          ...notes.map((n) =>
            n.note.created_at ? new Date(n.note.created_at).getTime() : 0
          )
        );
        if (newestTimestamp > 0) {
          lastSeenTimestamp = newestTimestamp + 1;
        }
      }
    };

    await onTick();

    startPolling({
      intervalMs: intervalSeconds * 1000,
      onTick,
    });
  }));

activityFeedCommand.addCommand(listCommand);
activityFeedCommand.addCommand(watchCommand);
