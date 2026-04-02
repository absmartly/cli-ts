import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import { isStdinPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';

const CONCURRENCY_LIMIT = 5;

export interface BulkOperationParams {
  rawIds: string[];
  note?: string;
  stdin?: boolean;
  state?: string;
  app?: string;
}

export interface BulkResult {
  id: ExperimentId;
  name: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResult {
  results: BulkResult[];
  succeeded: number;
  failed: number;
  total: number;
}

async function readStdinIds(): Promise<ExperimentId[]> {
  const lines = await readLinesFromStdin();
  return lines.map(line => parseExperimentId(line));
}

export async function collectBulkIds(
  client: APIClient,
  rawIds: string[],
  options: { stdin?: boolean; state?: string; app?: string },
): Promise<ExperimentId[]> {
  if (options.stdin || (isStdinPiped() && rawIds.length === 0)) {
    return readStdinIds();
  }

  if (rawIds.length > 0) {
    return rawIds.map(id => parseExperimentId(id));
  }

  if (!options.state && !options.app) {
    throw new Error('Provide experiment IDs, --stdin, or use --state / --app filters');
  }

  const listOptions: Record<string, string> = {};
  if (options.state) listOptions.state = options.state;
  if (options.app) listOptions.application = options.app;

  const experiments = await client.listExperiments(listOptions);
  return experiments.map(e => e.id);
}

export async function fetchBulkNames(
  client: APIClient,
  ids: ExperimentId[],
): Promise<Map<ExperimentId, string>> {
  const names = new Map<ExperimentId, string>();
  const queue = [...ids];

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift()!;
      try {
        const exp = await client.getExperiment(id);
        names.set(id, exp.name);
      } catch {
        names.set(id, `(unknown #${id})`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, ids.length) }, () => worker());
  await Promise.all(workers);
  return names;
}

export async function runBulkOperation(
  ids: ExperimentId[],
  names: Map<ExperimentId, string>,
  action: (id: ExperimentId) => Promise<unknown>,
): Promise<CommandResult<BulkOperationResult>> {
  const results: BulkResult[] = [];
  const queue = [...ids];

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift()!;
      const name = names.get(id) ?? `#${id}`;
      try {
        await action(id);
        results.push({ id, name, success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ id, name, success: false, error: message });
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, ids.length) }, () => worker());
  await Promise.all(workers);

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    data: {
      results,
      succeeded,
      failed,
      total: results.length,
    },
  };
}

export async function bulkStart(
  client: APIClient,
  ids: ExperimentId[],
  names: Map<ExperimentId, string>,
  note?: string,
): Promise<CommandResult<BulkOperationResult>> {
  return runBulkOperation(ids, names, id => client.startExperiment(id, note));
}

export async function bulkStop(
  client: APIClient,
  ids: ExperimentId[],
  names: Map<ExperimentId, string>,
  reason: string,
  note?: string,
): Promise<CommandResult<BulkOperationResult>> {
  return runBulkOperation(ids, names, id => client.stopExperiment(id, reason, note));
}

export async function bulkArchive(
  client: APIClient,
  ids: ExperimentId[],
  names: Map<ExperimentId, string>,
  note?: string,
): Promise<CommandResult<BulkOperationResult>> {
  return runBulkOperation(ids, names, id => client.archiveExperiment(id, false, note));
}

export async function bulkDevelopment(
  client: APIClient,
  ids: ExperimentId[],
  names: Map<ExperimentId, string>,
  note?: string,
): Promise<CommandResult<BulkOperationResult>> {
  const effectiveNote = note ?? 'Bulk development via CLI';
  return runBulkOperation(ids, names, id => client.developmentExperiment(id, effectiveNote));
}

export async function bulkFullOn(
  client: APIClient,
  ids: ExperimentId[],
  names: Map<ExperimentId, string>,
  variant: number,
  note?: string,
): Promise<CommandResult<BulkOperationResult>> {
  const effectiveNote = note ?? 'Bulk full-on via CLI';
  return runBulkOperation(ids, names, id => client.fullOnExperiment(id, variant, effectiveNote));
}
