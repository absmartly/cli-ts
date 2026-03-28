import { Command } from 'commander';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

const VALID_REASONS = [
  'hypothesis_rejected', 'hypothesis_iteration', 'user_feedback', 'data_issue',
  'implementation_issue', 'experiment_setup_issue', 'guardrail_metric_impact',
  'secondary_metric_impact', 'operational_decision', 'performance_issue',
  'testing', 'tracking_issue', 'code_cleaned_up', 'other',
] as const;

const CONCURRENCY_LIMIT = 5;

interface BulkOptions {
  note?: string;
  stdin?: boolean;
  dryRun?: boolean;
  state?: string;
  app?: string;
  yes?: boolean;
}

interface BulkResult {
  id: ExperimentId;
  name: string;
  success: boolean;
  error?: string;
}

import { isStdinPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';

async function readStdinIds(): Promise<ExperimentId[]> {
  const lines = await readLinesFromStdin();
  return lines.map(line => parseExperimentId(line));
}

async function collectIds(
  client: APIClient,
  rawIds: string[],
  options: BulkOptions,
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

async function fetchNames(
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
      } catch (e) {
        if (process.env.DEBUG) console.error(`Warning: could not resolve name for experiment ${id}: ${e instanceof Error ? e.message : e}`);
        names.set(id, `(unknown #${id})`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, ids.length) }, () => worker());
  await Promise.all(workers);
  return names;
}

async function runBulk<T>(
  ids: ExperimentId[],
  names: Map<ExperimentId, string>,
  action: (id: ExperimentId) => Promise<T>,
): Promise<BulkResult[]> {
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
  return results;
}

function printResults(results: BulkResult[], actionLabel: string) {
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  for (const r of succeeded) {
    console.log(chalk.green(`  ✓ ${r.name} (${r.id}) — ${actionLabel}`));
  }
  for (const r of failed) {
    console.log(chalk.red(`  ✗ ${r.name} (${r.id}) — ${r.error}`));
  }

  console.log('');
  console.log(`${chalk.bold('Results:')} ${succeeded.length} succeeded, ${failed.length} failed out of ${results.length}`);
  if (failed.length > 0) process.exitCode = 1;
}

function showSummary(ids: ExperimentId[], names: Map<ExperimentId, string>, actionLabel: string) {
  console.log(chalk.bold(`\nBulk ${actionLabel} — ${ids.length} experiment(s):\n`));
  for (const id of ids) {
    const name = names.get(id) ?? `#${id}`;
    console.log(`  - ${name} (${id})`);
  }
  console.log('');
}

function addSharedOptions(cmd: Command): Command {
  return cmd
    .option('--note <text>', 'activity log note')
    .option('--stdin', 'read experiment IDs from stdin (one per line)')
    .option('--dry-run', 'show what would happen without executing')
    .option('--state <state>', 'filter experiments by state')
    .option('--app <name>', 'filter experiments by application')
    .option('--yes', 'skip confirmation prompt');
}

const bulkStartCommand = addSharedOptions(
  new Command('start')
    .description('Start multiple experiments')
    .argument('[ids...]', 'experiment IDs'),
);

bulkStartCommand.action(withErrorHandling(async (rawIds: string[], options: BulkOptions) => {
  const globalOptions = getGlobalOptions(bulkStartCommand);
  const client = await getAPIClientFromOptions(globalOptions);

  const ids = await collectIds(client, rawIds, options);
  if (ids.length === 0) {
    console.log('No experiments matched.');
    return;
  }

  const names = await fetchNames(client, ids);
  showSummary(ids, names, 'start');

  if (options.dryRun) {
    console.log(chalk.blue('Dry run — no changes made.'));
    return;
  }

  if (!options.yes) {
    const proceed = await confirm({ message: `Start ${ids.length} experiment(s)?`, default: false });
    if (!proceed) return;
  }

  const results = await runBulk(ids, names, id => client.startExperiment(id, options.note));
  printResults(results, 'started');
}));

const bulkStopCommand = addSharedOptions(
  new Command('stop')
    .description('Stop multiple experiments')
    .argument('[ids...]', 'experiment IDs')
    .option('--reason <reason>', 'reason for stopping'),
);

bulkStopCommand.action(withErrorHandling(async (rawIds: string[], options: BulkOptions & { reason?: string }) => {
  const globalOptions = getGlobalOptions(bulkStopCommand);
  const client = await getAPIClientFromOptions(globalOptions);

  const ids = await collectIds(client, rawIds, options);
  if (ids.length === 0) {
    console.log('No experiments matched.');
    return;
  }

  const names = await fetchNames(client, ids);
  showSummary(ids, names, 'stop');

  const reason = options.reason || await select({
    message: 'Reason for stopping',
    choices: VALID_REASONS.map(r => ({ value: r, name: r.replace(/_/g, ' ') })),
  });

  if (options.dryRun) {
    console.log(chalk.blue(`Dry run — would stop with reason: ${reason}`));
    return;
  }

  if (!options.yes) {
    const proceed = await confirm({ message: `Stop ${ids.length} experiment(s) (reason: ${reason})?`, default: false });
    if (!proceed) return;
  }

  const results = await runBulk(ids, names, id => client.stopExperiment(id, reason, options.note));
  printResults(results, 'stopped');
}));

const bulkArchiveCommand = addSharedOptions(
  new Command('archive')
    .description('Archive multiple experiments')
    .argument('[ids...]', 'experiment IDs'),
);

bulkArchiveCommand.action(withErrorHandling(async (rawIds: string[], options: BulkOptions) => {
  const globalOptions = getGlobalOptions(bulkArchiveCommand);
  const client = await getAPIClientFromOptions(globalOptions);

  const ids = await collectIds(client, rawIds, options);
  if (ids.length === 0) {
    console.log('No experiments matched.');
    return;
  }

  const names = await fetchNames(client, ids);
  showSummary(ids, names, 'archive');

  if (options.dryRun) {
    console.log(chalk.blue('Dry run — no changes made.'));
    return;
  }

  if (!options.yes) {
    const proceed = await confirm({ message: `Archive ${ids.length} experiment(s)?`, default: false });
    if (!proceed) return;
  }

  const results = await runBulk(ids, names, id => client.archiveExperiment(id, false, options.note));
  printResults(results, 'archived');
}));

const bulkDevelopmentCommand = addSharedOptions(
  new Command('development')
    .alias('dev')
    .description('Put multiple experiments into development mode')
    .argument('[ids...]', 'experiment IDs'),
);

bulkDevelopmentCommand.action(withErrorHandling(async (rawIds: string[], options: BulkOptions) => {
  const globalOptions = getGlobalOptions(bulkDevelopmentCommand);
  const client = await getAPIClientFromOptions(globalOptions);

  const ids = await collectIds(client, rawIds, options);
  if (ids.length === 0) {
    console.log('No experiments matched.');
    return;
  }

  const names = await fetchNames(client, ids);
  showSummary(ids, names, 'development');

  if (options.dryRun) {
    console.log(chalk.blue('Dry run — no changes made.'));
    return;
  }

  if (!options.yes) {
    const proceed = await confirm({ message: `Set ${ids.length} experiment(s) to development?`, default: false });
    if (!proceed) return;
  }

  const note = options.note ?? 'Bulk development via CLI';
  const results = await runBulk(ids, names, id => client.developmentExperiment(id, note));
  printResults(results, 'set to development');
}));

const bulkFullOnCommand = addSharedOptions(
  new Command('full-on')
    .description('Set multiple experiments to full-on mode')
    .argument('[ids...]', 'experiment IDs')
    .option('--variant <number>', 'variant number (>= 1)', (v) => {
      const num = parseInt(v, 10);
      if (!Number.isInteger(num) || num < 1) {
        throw new Error(`Invalid variant: "${v}" must be an integer >= 1`);
      }
      return num;
    }),
);

bulkFullOnCommand.action(withErrorHandling(async (rawIds: string[], options: BulkOptions & { variant?: number }) => {
  const globalOptions = getGlobalOptions(bulkFullOnCommand);
  const client = await getAPIClientFromOptions(globalOptions);

  const ids = await collectIds(client, rawIds, options);
  if (ids.length === 0) {
    console.log('No experiments matched.');
    return;
  }

  const names = await fetchNames(client, ids);
  showSummary(ids, names, 'full-on');

  const variant = options.variant ?? await select({
    message: 'Select variant for full-on',
    choices: [1, 2, 3, 4, 5].map(n => ({ value: n, name: `Variant ${n}` })),
  });

  if (options.dryRun) {
    console.log(chalk.blue(`Dry run — would set full-on to variant ${variant}`));
    return;
  }

  if (!options.yes) {
    const proceed = await confirm({ message: `Set ${ids.length} experiment(s) to full-on (variant ${variant})?`, default: false });
    if (!proceed) return;
  }

  const note = options.note ?? 'Bulk full-on via CLI';
  const results = await runBulk(ids, names, id => client.fullOnExperiment(id, variant, note));
  printResults(results, `set to full-on (variant ${variant})`);
}));

export const bulkCommand = new Command('bulk')
  .description('Bulk operations on experiments');

for (const cmd of [bulkStartCommand, bulkStopCommand, bulkArchiveCommand, bulkDevelopmentCommand, bulkFullOnCommand]) {
  bulkCommand.addCommand(cmd);
}
