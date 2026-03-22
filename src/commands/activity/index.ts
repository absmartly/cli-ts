import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import { startPolling } from '../../lib/utils/polling.js';
import type { Note, Experiment } from '../../api-client/types.js';
import type { APIClient } from '../../api-client/api-client.js';

interface ActivityNote {
  note: Note;
  experiment: Experiment;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getUserName(note: Note): string {
  const createdBy = note.created_by as { first_name?: string; last_name?: string } | undefined;
  if (!createdBy) return 'System';
  const parts = [createdBy.first_name, createdBy.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'System';
}

function printActivityNotes(items: ActivityNote[], showNotes = false): void {
  if (items.length === 0) {
    console.log(chalk.blue('No activity found'));
    return;
  }

  for (const { note, experiment } of items) {
    const ts = note.created_at ? formatTimestamp(note.created_at) : 'unknown';
    const user = getUserName(note);
    const action = note.action ?? 'unknown';

    console.log(
      `${chalk.gray(`[${ts}]`)} ${chalk.cyan(`${experiment.name}`)} ${chalk.gray(`(id:${experiment.id})`)} — ${chalk.white(`${user}: ${action}`)}`
    );

    if (showNotes && note.note) {
      console.log(`  ${chalk.white(`→ "${note.note}"`)}`);
    }
  }
}

async function fetchAllActivity(
  client: APIClient,
  options: { items?: number; state?: string; since?: number | undefined }
): Promise<ActivityNote[]> {
  const listOptions: { sort: string; items: number; state?: string } = {
    sort: 'updated_at',
    items: options.items ?? 20,
  };
  if (options.state) listOptions.state = options.state;

  const experiments = await client.listExperiments(listOptions);

  const allNotes: ActivityNote[] = [];

  for (const exp of experiments) {
    const notes = await client.listExperimentActivity(exp.id);
    for (const note of notes) {
      allNotes.push({ note, experiment: exp });
    }
  }

  allNotes.sort((a, b) => {
    const dateA = a.note.created_at ? new Date(a.note.created_at).getTime() : 0;
    const dateB = b.note.created_at ? new Date(b.note.created_at).getTime() : 0;
    return dateB - dateA;
  });

  if (options.since) {
    return allNotes.filter((item) => {
      if (!item.note.created_at) return false;
      return new Date(item.note.created_at).getTime() >= options.since!;
    });
  }

  return allNotes;
}

export const activityFeedCommand = new Command('activity-feed')
  .description('Global activity feed across experiments');

const listCommand = new Command('list')
  .description('List recent activity across all experiments')
  .option('--items <n>', 'number of experiments to fetch activity from', '20')
  .option('--since <date>', 'only show activity after this date (e.g. 7d, 2w, 2026-01-01)')
  .option('--state <state>', 'filter experiments by state')
  .option('--notes', 'show note text for each activity entry')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const since = parseDateFlagOrUndefined(options.since);
    const items = parseInt(options.items, 10);

    const fetchOptions: { items: number; state?: string; since?: number } = { items };
    if (options.state) fetchOptions.state = options.state;
    if (since !== undefined) fetchOptions.since = since;

    const notes = await fetchAllActivity(client, fetchOptions);

    printActivityNotes(notes, options.notes);
  }));

const watchCommand = new Command('watch')
  .description('Watch activity feed in real-time')
  .option('--interval <seconds>', 'poll interval in seconds', '30')
  .option('--items <n>', 'number of experiments to watch', '20')
  .option('--state <state>', 'filter experiments by state')
  .option('--notes', 'show note text for each activity entry')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(watchCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const intervalSeconds = parseInt(options.interval, 10);
    const items = parseInt(options.items, 10);

    let lastSeenTimestamp: number | undefined;

    console.log(chalk.blue(`Watching activity (polling every ${intervalSeconds}s)... Press Ctrl+C to stop\n`));

    const onTick = async () => {
      const fetchOptions: { items: number; state?: string; since?: number } = { items };
      if (options.state) fetchOptions.state = options.state;
      if (lastSeenTimestamp !== undefined) fetchOptions.since = lastSeenTimestamp;

      const notes = await fetchAllActivity(client, fetchOptions);

      if (notes.length > 0) {
        printActivityNotes(notes, options.notes);

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
