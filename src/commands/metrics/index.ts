import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseMetricId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeMetric, summarizeMetricRow } from '../../api-client/entity-summary.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import { parseCSV } from '../../api-client/payload/parse-csv.js';
import type { APIClient } from '../../api-client/api-client.js';

function allNumeric(refs: string[]): boolean {
  return refs.every(r => !isNaN(parseInt(r, 10)) && String(parseInt(r, 10)) === r.trim());
}

async function resolveOwnerIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveUsers(refs);
  return resolved.map(u => u.id).join(',');
}

async function resolveTeamIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveTeams(refs);
  return resolved.map(t => t.id).join(',');
}
import { accessCommand } from './access.js';
import { reviewCommand } from './review.js';
import { followCommand, unfollowCommand } from './follow.js';

export const metricsCommand = new Command('metrics')
  .alias('metric')
  .description('Metric commands');

const listCommand = createListCommand({
  description: 'List all metrics',
  defaultItems: 100,
  fetch: async (client, options) => {
    const ownerIds = options.owners ? await resolveOwnerIds(client, options.owners as string) : undefined;
    const teamIds = options.teams ? await resolveTeamIds(client, options.teams as string) : undefined;

    return client.listMetrics({
      items: options.items as number,
      page: options.page as number,
      archived: options.archived as boolean,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sort_asc: options.asc ? true : options.desc ? false : undefined,
      ids: options.ids as string | undefined,
      owners: ownerIds,
      teams: teamIds,
      review_status: options.reviewStatus as string | undefined,
    });
  },
  summarizeRow: summarizeMetricRow,
  extraOptions: (cmd) => cmd
    .option('--archived', 'include archived metrics')
    .option('--search <query>', 'search by name, tag, goal, or owner')
    .option('--sort <field>', 'sort by field (e.g. name, created_at, updated_at)')
    .option('--asc', 'sort in ascending order')
    .option('--desc', 'sort in descending order')
    .option('--ids <ids>', 'filter by metric IDs (comma-separated)')
    .option('--owners <values>', 'filter by owners (comma-separated IDs, names, or emails)')
    .option('--teams <values>', 'filter by teams (comma-separated IDs or names)')
    .option('--review-status <status>', 'filter by review status (pending, approved, none)'),
});

const getCommand = new Command('get')
  .description('Get metric details')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const metric = await client.getMetric(id);
    const data = globalOptions.raw ? metric : applyShowExclude(summarizeMetric(metric as Record<string, unknown>), metric as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new metric')
  .requiredOption('--name <name>', 'metric name')
  .requiredOption('--type <type>', 'metric type (goal_count, goal_unique_count, goal_ratio, goal_property)')
  .requiredOption('--description <text>', 'metric description')
  .option('--effect <effect>', 'expected effect direction (positive, negative)', 'positive')
  .option('--goal-id <id>', 'goal ID (required for goal_* types)', parseInt)
  .option('--owner <user_id>', 'owner user ID', parseInt)
  .option('--format-str <str>', 'display format string', '{}')
  .option('--scale <n>', 'display scale', parseInt, 1)
  .option('--precision <n>', 'display precision', parseInt, 2)
  .option('--mean-format-str <str>', 'mean display format string', '{}%')
  .option('--mean-scale <n>', 'mean display scale', parseInt, 100)
  .option('--mean-precision <n>', 'mean display precision', parseInt, 2)
  .option('--outlier-limit-method <method>', 'outlier limit method (unlimited, tukey, percentile)', 'unlimited')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, unknown> = {
      name: options.name,
      type: options.type,
      description: options.description,
      effect: options.effect,
      format_str: options.formatStr,
      scale: options.scale,
      precision: options.precision,
      mean_format_str: options.meanFormatStr,
      mean_scale: options.meanScale,
      mean_precision: options.meanPrecision,
      outlier_limit_method: options.outlierLimitMethod,
    };

    if (options.goalId) data.goal_id = options.goalId;
    if (options.owner) data.owners = [{ user_id: options.owner }];

    const metric = await client.createMetric(data);
    console.log(chalk.green(`✓ Metric created with ID: ${metric.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.description !== undefined) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateMetric(id, data);
    console.log(chalk.green(`✓ Metric ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--unarchive', 'unarchive the metric')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveMetric(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Metric ${id} ${action}`));
  }));

const activateCommand = new Command('activate')
  .description('Activate a metric version')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--reason <text>', 'reason for activation')
  .action(withErrorHandling(async (id: MetricId, options) => {
    const globalOptions = getGlobalOptions(activateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.activateMetric(id, options.reason);
    console.log(chalk.green(`✓ Metric ${id} activated`));
  }));

metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(getCommand);
metricsCommand.addCommand(createCommand);
metricsCommand.addCommand(updateCommand);
metricsCommand.addCommand(archiveCommand);
metricsCommand.addCommand(activateCommand);
metricsCommand.addCommand(accessCommand);
metricsCommand.addCommand(reviewCommand);
metricsCommand.addCommand(followCommand);
metricsCommand.addCommand(unfollowCommand);
