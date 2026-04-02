import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { Note, Experiment } from '../../api-client/types.js';

export interface ActivityNote {
  note: Note;
  experiment: Experiment;
}

export interface NoteLookups {
  users?: Map<number, string> | undefined;
  teams?: Map<number, string> | undefined;
}

function getUserName(note: Note): string {
  const createdBy = note.created_by as { first_name?: string; last_name?: string } | undefined;
  if (!createdBy) return 'System';
  const parts = [createdBy.first_name, createdBy.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'System';
}

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

export interface ActivityEntry {
  timestamp: string | undefined;
  user: string;
  action: string;
  experimentName: string;
  experimentId: number;
  noteText?: string | undefined;
}

export function formatActivityEntry(item: ActivityNote, lookups: NoteLookups = {}): ActivityEntry {
  const ts = item.note.created_at ?? undefined;
  const user = getUserName(item.note);
  const action = item.note.action ?? 'unknown';
  const noteText = item.note.note ? resolveMentions(item.note.note, lookups) : undefined;

  return {
    timestamp: ts,
    user,
    action,
    experimentName: item.experiment.name,
    experimentId: item.experiment.id,
    noteText,
  };
}

export interface FetchActivityParams {
  items?: number | undefined;
  state?: string | undefined;
  since?: number | undefined;
  sort?: string | undefined;
  search?: string | undefined;
}

export async function fetchAllActivity(
  client: APIClient,
  params: FetchActivityParams,
): Promise<ActivityNote[]> {
  const fetchCount = params.items ?? 20;
  const listOptions: Record<string, unknown> = {
    sort: params.sort ?? 'updated_at',
    items: fetchCount,
  };
  if (params.state) listOptions.state = params.state;
  if (params.search) listOptions.search = params.search;

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

  if (params.since) {
    return allNotes.filter((item) => {
      if (!item.note.created_at) return false;
      return new Date(item.note.created_at).getTime() >= params.since!;
    });
  }

  return allNotes;
}

export async function buildLookups(client: APIClient): Promise<NoteLookups> {
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

export interface ListActivityParams {
  experiments?: number | undefined;
  limit?: number | undefined;
  since?: number | undefined;
  state?: string | undefined;
  search?: string | undefined;
  sort?: string | undefined;
  includeNotes?: boolean | undefined;
}

export async function listActivity(
  client: APIClient,
  params: ListActivityParams,
): Promise<CommandResult<ActivityEntry[]>> {
  const fetchOptions: FetchActivityParams = {
    items: params.experiments ?? 50,
    state: params.state,
    search: params.search,
    sort: params.sort,
    since: params.since,
  };

  const [allNotes, lookups] = await Promise.all([
    fetchAllActivity(client, fetchOptions),
    params.includeNotes ? buildLookups(client) : Promise.resolve({} as NoteLookups),
  ]);

  const limit = params.limit ?? 20;
  const notes = allNotes.slice(0, limit);
  const entries = notes.map(n => formatActivityEntry(n, lookups));

  return {
    data: entries,
    warnings: allNotes.length > limit
      ? [`Showing ${limit} of ${allNotes.length} entries. Use --limit to show more.`]
      : undefined,
  };
}
