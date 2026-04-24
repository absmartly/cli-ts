import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseMetricId } from '../../lib/utils/validators.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import {
  applyShowExclude,
  summarizeMetric,
  summarizeMetricRow,
} from '../../api-client/entity-summary.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import { listMetrics as coreListMetrics } from '../../core/metrics/list.js';
import { getMetric } from '../../core/metrics/get.js';
import { createMetric } from '../../core/metrics/create.js';
import { updateMetric } from '../../core/metrics/update.js';
import { archiveMetric } from '../../core/metrics/archive.js';
import { activateMetric } from '../../core/metrics/activate.js';
import { createMetricVersion } from '../../core/metrics/new-version.js';
import { resolveGoalId } from '../../core/resolve.js';
import { accessCommand } from './access.js';
import { reviewCommand } from './review.js';
import { followCommand, unfollowCommand } from './follow.js';

export const metricsCommand = new Command('metrics').alias('metric').description('Metric commands');

const listCommand = createListCommand({
  description: 'List all metrics',
  defaultItems: 100,
  fetch: async (client, options) => {
    const result = await coreListMetrics(client, {
      items: options.items as number,
      page: options.page as number,
      archived: options.archived as boolean,
      include_drafts: options.includeDrafts as boolean,
      search: options.search as string | undefined,
      sort: options.sort as string | undefined,
      sortAsc: options.asc ? true : options.desc ? false : undefined,
      ids: options.ids as string | undefined,
      owners: options.owners as string | undefined,
      teams: options.teams as string | undefined,
      reviewStatus: options.reviewStatus as string | undefined,
    });
    return result.data;
  },
  summarizeRow: summarizeMetricRow,
  extraOptions: (cmd) =>
    cmd
      .option('--include-drafts', 'include draft (non-activated) metrics')
      .option('--owners <values>', 'filter by owners (comma-separated IDs, names, or emails)')
      .option('--teams <values>', 'filter by teams (comma-separated IDs or names)')
      .option('--review-status <status>', 'filter by review status (pending, approved, none)'),
});

const getCommand = new Command('get')
  .description('Get metric details')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(
    withErrorHandling(async (id: MetricId, options) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const show = (options.show as string[] | undefined) ?? [];
      const exclude = (options.exclude as string[] | undefined) ?? [];

      const result = await getMetric(client, { id });
      const data = globalOptions.raw
        ? result.data
        : applyShowExclude(
            summarizeMetric(result.data as Record<string, unknown>),
            result.data as Record<string, unknown>,
            show,
            exclude
          );
      printFormatted(data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new metric (or a new version of an existing metric with --new-version)')
  .option('--name <name>', 'metric name')
  .option(
    '--type <type>',
    'metric type (goal_count, goal_unique_count, goal_ratio, goal_property)'
  )
  .option('--description <text>', 'metric description')
  .option('--effect <effect>', 'expected effect direction (positive, negative)')
  .option('--goal <name-or-id>', 'goal name or ID (required for goal_* types)')
  .option('--goal-id <id>', 'goal ID (deprecated, use --goal instead)', parseInt)
  .option('--owner <user_id>', 'owner user ID', parseInt)
  .option('--format-str <str>', 'display format string')
  .option('--scale <n>', 'display scale', parseInt)
  .option('--precision <n>', 'display precision', parseInt)
  .option('--mean-format-str <str>', 'mean display format string')
  .option('--mean-scale <n>', 'mean display scale', parseInt)
  .option('--mean-precision <n>', 'mean display precision', parseInt)
  .option(
    '--outlier-limit-method <method>',
    'outlier limit method (unlimited, tukey, percentile)'
  )
  .option(
    '--value-source-property <property>',
    'value source property (required for goal_property type)'
  )
  .option('--activate', 'activate the metric immediately after creation')
  .option(
    '--new-version <id>',
    'create a new draft version of metric <id> instead of a fresh metric (requires --reason)',
    parseMetricId as (v: string) => MetricId
  )
  .option('--reason <text>', 'reason note (required with --new-version)')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const goalRef = (options.goal as string | undefined) ?? options.goalId;
      const goalId = goalRef != null ? await resolveGoalId(client, String(goalRef)) : undefined;

      if (options.newVersion !== undefined) {
        if (!options.reason) {
          throw new Error('--reason is required when using --new-version');
        }
        const versionResult = await createMetricVersion(client, {
          id: options.newVersion as MetricId,
          reason: options.reason,
          name: options.name,
          description: options.description,
          type: options.type,
          effect: options.effect,
          goalId,
          owner: options.owner,
          formatStr: options.formatStr,
          scale: options.scale,
          precision: options.precision,
          meanFormatStr: options.meanFormatStr,
          meanScale: options.meanScale,
          meanPrecision: options.meanPrecision,
          outlierLimitMethod: options.outlierLimitMethod,
          valueSourceProperty: options.valueSourceProperty,
        });
        const newId = versionResult.data.id;
        if (options.activate) {
          await client.activateMetric(newId as MetricId, options.reason);
          console.log(
            chalk.green(`✓ New metric version created and activated (id: ${newId})`)
          );
        } else {
          console.log(chalk.green(`✓ New metric version created as draft (id: ${newId})`));
        }
        return;
      }

      const missing: string[] = [];
      if (!options.name) missing.push('--name');
      if (!options.type) missing.push('--type');
      if (!options.description) missing.push('--description');
      if (missing.length > 0) {
        throw new Error(
          `Missing required option${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
        );
      }

      const result = await createMetric(client, {
        name: options.name,
        type: options.type,
        description: options.description,
        effect: options.effect ?? 'positive',
        goalId,
        owner: options.owner,
        formatStr: options.formatStr ?? '{}',
        scale: options.scale ?? 1,
        precision: options.precision ?? 2,
        meanFormatStr: options.meanFormatStr ?? '{}%',
        meanScale: options.meanScale ?? 100,
        meanPrecision: options.meanPrecision ?? 2,
        outlierLimitMethod: options.outlierLimitMethod ?? 'unlimited',
        valueSourceProperty: options.valueSourceProperty,
      });

      if (options.activate) {
        await client.activateMetric(result.data.id as MetricId, 'Initial activation');
        console.log(chalk.green(`✓ Metric created and activated with ID: ${result.data.id}`));
      } else {
        console.log(chalk.green(`✓ Metric created with ID: ${result.data.id}`));
      }
    })
  );

const updateCommand = new Command('update')
  .description(
    'Update in-place editable fields of a metric (name, description, owner). For version-level changes (type, goal, format, etc.) use `metric version`.'
  )
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--name <name>', 'new name')
  .option('--description <text>', 'new description')
  .option('--owner <user_id>', 'new owner user ID', parseInt)
  .action(
    withErrorHandling(async (id: MetricId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await updateMetric(client, {
        id,
        name: options.name,
        description: options.description,
        owner: options.owner,
      });
      console.log(chalk.green(`✓ Metric ${id} updated`));
    })
  );

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .option('--unarchive', 'unarchive the metric')
  .action(
    withErrorHandling(async (id: MetricId, options) => {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await archiveMetric(client, { id, unarchive: options.unarchive });
      const action = options.unarchive ? 'unarchived' : 'archived';
      console.log(chalk.green(`✓ Metric ${id} ${action}`));
    })
  );

const activateCommand = new Command('activate')
  .description('Activate a metric version')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--reason <text>', 'reason for activation')
  .action(
    withErrorHandling(async (id: MetricId, options) => {
      const globalOptions = getGlobalOptions(activateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await activateMetric(client, { id, reason: options.reason });
      console.log(chalk.green(`✓ Metric ${id} activated`));
    })
  );

const versionCommand = new Command('version')
  .alias('new-version')
  .description(
    'Create a new draft version of a metric with changed version-level fields (type, goal, format, etc.). Fields not provided are inherited from the current version.'
  )
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--reason <text>', 'reason note for the new version')
  .option('--name <name>', 'metric name')
  .option(
    '--type <type>',
    'metric type (goal_count, goal_unique_count, goal_ratio, goal_property)'
  )
  .option('--description <text>', 'metric description')
  .option('--effect <effect>', 'expected effect direction (positive, negative)')
  .option('--goal <name-or-id>', 'goal name or ID')
  .option('--goal-id <id>', 'goal ID (deprecated, use --goal instead)', parseInt)
  .option('--owner <user_id>', 'owner user ID', parseInt)
  .option('--format-str <str>', 'display format string')
  .option('--scale <n>', 'display scale', parseInt)
  .option('--precision <n>', 'display precision', parseInt)
  .option('--mean-format-str <str>', 'mean display format string')
  .option('--mean-scale <n>', 'mean display scale', parseInt)
  .option('--mean-precision <n>', 'mean display precision', parseInt)
  .option(
    '--outlier-limit-method <method>',
    'outlier limit method (unlimited, tukey, percentile)'
  )
  .option('--value-source-property <property>', 'value source property')
  .option('--activate', 'activate the new version immediately after creation')
  .action(
    withErrorHandling(async (id: MetricId, options) => {
      const globalOptions = getGlobalOptions(versionCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const goalRef = (options.goal as string | undefined) ?? options.goalId;
      const goalId = goalRef != null ? await resolveGoalId(client, String(goalRef)) : undefined;

      const result = await createMetricVersion(client, {
        id,
        reason: options.reason,
        name: options.name,
        description: options.description,
        type: options.type,
        effect: options.effect,
        goalId,
        owner: options.owner,
        formatStr: options.formatStr,
        scale: options.scale,
        precision: options.precision,
        meanFormatStr: options.meanFormatStr,
        meanScale: options.meanScale,
        meanPrecision: options.meanPrecision,
        outlierLimitMethod: options.outlierLimitMethod,
        valueSourceProperty: options.valueSourceProperty,
      });

      const newId = result.data.id;
      if (options.activate) {
        await client.activateMetric(newId as MetricId, options.reason);
        console.log(
          chalk.green(
            `✓ New version of metric ${id} created and activated (new id: ${newId})`
          )
        );
      } else {
        console.log(
          chalk.green(`✓ New draft version of metric ${id} created (new id: ${newId})`)
        );
      }
    })
  );

metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(getCommand);
metricsCommand.addCommand(createCommand);
metricsCommand.addCommand(updateCommand);
metricsCommand.addCommand(archiveCommand);
metricsCommand.addCommand(activateCommand);
metricsCommand.addCommand(versionCommand);
metricsCommand.addCommand(accessCommand);
metricsCommand.addCommand(reviewCommand);
metricsCommand.addCommand(followCommand);
metricsCommand.addCommand(unfollowCommand);
