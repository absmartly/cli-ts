import { Command } from 'commander';
import chalk from 'chalk';
import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { highlight } from 'cli-highlight';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import { startPolling } from '../../lib/utils/polling.js';
import type { Note, Experiment } from '../../api-client/types.js';
import type { APIClient } from '../../api-client/api-client.js';

interface ActivityNote {
  note: Note;
  experiment: Experiment;
}

import { formatDateTime } from '../../api-client/format-helpers.js';

function getUserName(note: Note): string {
  const createdBy = note.created_by as { first_name?: string; last_name?: string } | undefined;
  if (!createdBy) return 'System';
  const parts = [createdBy.first_name, createdBy.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'System';
}

export interface NoteLookups {
  users?: Map<number, string>;
  teams?: Map<number, string>;
}

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

export function resolveMentions(text: string, lookups: NoteLookups = {}): string {
  return text
    .replace(/\[@user_id:(\d+)\]/g, (_, id) => {
      const name = lookups.users?.get(parseInt(id, 10));
      return name ? `**@${name}**` : `@user:${id}`;
    })
    .replace(/\[@team_id:(\d+)\]/g, (_, id) => {
      const name = lookups.teams?.get(parseInt(id, 10));
      return name ? `**@${name}**` : `@team:${id}`;
    });
}

export function formatNoteText(text: string, lookups: NoteLookups = {}): string {
  const resolved = resolveMentions(text, lookups);
  const rendered = terminalMarked.parse(resolved) as string;
  return rendered
    .replace(/^( *)(\* )/gm, '$1● ')
    .trim();
}

function printActivityNotes(items: ActivityNote[], showNotes = false, lookups: NoteLookups = {}): void {
  if (items.length === 0) {
    console.log(chalk.blue('No activity found'));
    return;
  }

  for (const { note, experiment } of items) {
    const ts = note.created_at ? formatDateTime(note.created_at) : 'unknown';
    const user = getUserName(note);
    const action = note.action ?? 'unknown';

    console.log(
      `${chalk.gray(`[${ts}]`)} ${chalk.cyan(`${experiment.name}`)} ${chalk.gray(`(id:${experiment.id})`)} — ${chalk.white(`${user}: ${action}`)}`
    );

    if (showNotes && note.note) {
      const formatted = formatNoteText(note.note, lookups);
      if (formatted) {
        console.log(`  ${chalk.white(`→ ${formatted}`)}`);
      }
    }
  }
}

async function fetchAllActivity(
  client: APIClient,
  options: { items?: number; state?: string; since?: number | undefined; sort?: string; search?: string }
): Promise<ActivityNote[]> {
  const fetchCount = options.items ?? 20;
  const listOptions: Record<string, unknown> = {
    sort: options.sort ?? 'updated_at',
    items: fetchCount,
  };
  if (options.state) listOptions.state = options.state;
  if (options.search) listOptions.search = options.search;

  const experiments = await client.listExperiments(listOptions as any);

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

async function buildLookups(client: APIClient): Promise<NoteLookups> {
  const [users, teams] = await Promise.all([
    client.listUsers({ items: 500 }),
    client.listTeams(false, 500),
  ]);
  const userMap = new Map<number, string>();
  for (const u of users) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
    userMap.set(u.id, name);
  }
  const teamMap = new Map<number, string>();
  for (const t of teams) {
    teamMap.set(t.id, t.name);
  }
  return { users: userMap, teams: teamMap };
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
    const experiments = parseInt(options.items ?? options.experiments, 10);
    const limit = parseInt(options.limit, 10);

    const fetchOptions: { items: number; state?: string; since?: number; sort?: string; search?: string } = { items: experiments };
    if (options.state) fetchOptions.state = options.state;
    if (options.search) fetchOptions.search = options.search;
    if (since !== undefined) fetchOptions.since = since;
    if (options.sort) fetchOptions.sort = options.sort;

    const [allNotes, lookups] = await Promise.all([
      fetchAllActivity(client, fetchOptions),
      options.notes ? buildLookups(client) : Promise.resolve({}),
    ]);

    const notes = allNotes.slice(0, limit);
    printActivityNotes(notes, options.notes, lookups);
    if (allNotes.length > limit) {
      console.log(chalk.gray(`Showing ${limit} of ${allNotes.length} entries. Use --limit to show more.`));
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

    const intervalSeconds = parseInt(options.interval, 10);
    const experiments = parseInt(options.items ?? options.experiments, 10);

    let lastSeenTimestamp: number | undefined;
    const lookups = options.notes ? await buildLookups(client) : {};

    console.log(chalk.blue(`Watching activity (polling every ${intervalSeconds}s)... Press Ctrl+C to stop\n`));

    const onTick = async () => {
      const fetchOptions: { items: number; state?: string; since?: number; sort?: string } = { items: experiments };
      if (options.state) fetchOptions.state = options.state;
      if (options.sort) fetchOptions.sort = options.sort;
      if (lastSeenTimestamp !== undefined) fetchOptions.since = lastSeenTimestamp;

      const notes = await fetchAllActivity(client, fetchOptions);

      if (notes.length > 0) {
        printActivityNotes(notes, options.notes, lookups);

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
