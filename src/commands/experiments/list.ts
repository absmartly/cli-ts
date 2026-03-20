import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import type { ListOptions } from '../../lib/api/types.js';
import { summarizeExperimentRow } from '../../api-client/experiment-summary.js';
import { getDefaultType } from './default-type.js';

export const listCommand = new Command('list')
  .description('List experiments')
  .option('--state <state>', 'filter by state (created, ready, running, stopped, archived)')
  .option('--type <type>', 'filter by type (test, feature)')
  .option('--app <app>', 'filter by application')
  .option('--search <query>', 'search by name or display name')
  .option('--unit-types <ids>', 'filter by unit types (comma-separated IDs)')
  .option('--owners <ids>', 'filter by owner user IDs (comma-separated)')
  .option('--teams <ids>', 'filter by team IDs (comma-separated)')
  .option('--tags <ids>', 'filter by tag IDs (comma-separated)')
  .option('--created-after <timestamp>', 'filter experiments created after timestamp')
  .option('--created-before <timestamp>', 'filter experiments created before timestamp')
  .option('--started-after <timestamp>', 'filter experiments started after timestamp')
  .option('--started-before <timestamp>', 'filter experiments started before timestamp')
  .option('--stopped-after <timestamp>', 'filter experiments stopped after timestamp')
  .option('--stopped-before <timestamp>', 'filter experiments stopped before timestamp')
  .option('--analysis-type <type>', 'filter by analysis type (fixed_horizon, group_sequential)')
  .option('--running-type <type>', 'filter by running type (full_on, experiment)')
  .option('--alert-srm <value>', 'filter by sample ratio mismatch alert (1 for true)', parseInt)
  .option('--alert-cleanup-needed <value>', 'filter by cleanup needed alert (1 for true)', parseInt)
  .option('--alert-audience-mismatch <value>', 'filter by audience mismatch alert (1 for true)', parseInt)
  .option('--alert-sample-size-reached <value>', 'filter by sample size reached alert (1 for true)', parseInt)
  .option('--alert-experiments-interact <value>', 'filter by experiments interact alert (1 for true)', parseInt)
  .option('--alert-group-sequential-updated <value>', 'filter by group sequential updated alert (1 for true)', parseInt)
  .option('--alert-assignment-conflict <value>', 'filter by assignment conflict alert (1 for true)', parseInt)
  .option('--alert-metric-threshold-reached <value>', 'filter by metric threshold reached alert (1 for true)', parseInt)
  .option('--significance <value>', 'filter by significance (positive, negative, insignificant)')
  .option('--items <number>', 'number of results per page', (v) => parseInt(v, 10), 20)
  .option('--page <number>', 'page number (default: 1)', (v) => parseInt(v, 10), 1)
  .option('--sort <field>', 'sort by field (e.g. created_at, name, state)')
  .option('--asc', 'sort in ascending order')
  .option('--desc', 'sort in descending order')
  .option('--show <fields...>', 'include additional fields (e.g. --show experiment_report archived)')
  .option('--exclude <fields...>', 'hide columns (e.g. --exclude primary_metric owner)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const createdAfter = parseDateFlagOrUndefined(options.createdAfter);
    const createdBefore = parseDateFlagOrUndefined(options.createdBefore);
    const startedAfter = parseDateFlagOrUndefined(options.startedAfter);
    const startedBefore = parseDateFlagOrUndefined(options.startedBefore);
    const stoppedAfter = parseDateFlagOrUndefined(options.stoppedAfter);
    const stoppedBefore = parseDateFlagOrUndefined(options.stoppedBefore);

    const listOptions: ListOptions = {
      page: options.page,
      items: options.items,
      previews: true,
      ...(options.sort && { sort: options.sort }),
      ...(options.asc && { ascending: true }),
      ...(options.desc && { ascending: false }),
      ...(options.app && { application: options.app }),
      ...(options.state && { state: options.state }),
      type: options.type || getDefaultType(),
      ...(options.search && { search: options.search }),
      ...(options.unitTypes && { unit_types: options.unitTypes }),
      ...(options.owners && { owners: options.owners }),
      ...(options.teams && { teams: options.teams }),
      ...(options.tags && { tags: options.tags }),
      ...(createdAfter !== undefined && { created_after: createdAfter }),
      ...(createdBefore !== undefined && { created_before: createdBefore }),
      ...(startedAfter !== undefined && { started_after: startedAfter }),
      ...(startedBefore !== undefined && { started_before: startedBefore }),
      ...(stoppedAfter !== undefined && { stopped_after: stoppedAfter }),
      ...(stoppedBefore !== undefined && { stopped_before: stoppedBefore }),
      ...(options.analysisType && { analysis_type: options.analysisType }),
      ...(options.runningType && { running_type: options.runningType }),
      ...(options.alertSrm !== undefined && { alert_srm: options.alertSrm }),
      ...(options.alertCleanupNeeded !== undefined && { alert_cleanup_needed: options.alertCleanupNeeded }),
      ...(options.alertAudienceMismatch !== undefined && { alert_audience_mismatch: options.alertAudienceMismatch }),
      ...(options.alertSampleSizeReached !== undefined && { alert_sample_size_reached: options.alertSampleSizeReached }),
      ...(options.alertExperimentsInteract !== undefined && { alert_experiments_interact: options.alertExperimentsInteract }),
      ...(options.alertGroupSequentialUpdated !== undefined && { alert_group_sequential_updated: options.alertGroupSequentialUpdated }),
      ...(options.alertAssignmentConflict !== undefined && { alert_assignment_conflict: options.alertAssignmentConflict }),
      ...(options.alertMetricThresholdReached !== undefined && { alert_metric_threshold_reached: options.alertMetricThresholdReached }),
      ...(options.significance && { significance: options.significance }),
    };

    const experiments = await client.listExperiments(listOptions);

    const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
    if (useRaw) {
      printFormatted(experiments, globalOptions);
    } else {
      const extraFields = (options.show as string[] | undefined) ?? [];
      const excludeFields = new Set((options.exclude as string[] | undefined) ?? []);
      let rows = (experiments as Array<Record<string, unknown>>).map(e => summarizeExperimentRow(e, extraFields));
      if (excludeFields.size > 0) {
        rows = rows.map(row => {
          const filtered: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            if (!excludeFields.has(k)) filtered[k] = v;
          }
          return filtered;
        });
      }
      printFormatted(rows, globalOptions);

      const page = options.page ?? 1;
      const items = options.items ?? 20;
      const count = experiments.length;
      const hasMore = count === items;
      const footer = hasMore
        ? `Page ${page} (${count} results). Next: --page ${page + 1}`
        : `Page ${page} (${count} results).`;
      console.log(chalk.gray(footer));
    }
  }));
