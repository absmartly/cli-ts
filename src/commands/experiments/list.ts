import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import type { ListOptions } from '../../lib/api/types.js';

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
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .option('--page <number>', 'page number for pagination', parseInt)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const limit = options.limit;
    const offset = options.page && options.page > 0
      ? (options.page - 1) * limit
      : options.offset;

    const listOptions: ListOptions = {
      limit,
      offset,
      application: options.app,
      state: options.state,
      type: options.type,
      search: options.search,
      unit_types: options.unitTypes,
      owners: options.owners,
      teams: options.teams,
      tags: options.tags,
      created_after: parseDateFlagOrUndefined(options.createdAfter),
      created_before: parseDateFlagOrUndefined(options.createdBefore),
      started_after: parseDateFlagOrUndefined(options.startedAfter),
      started_before: parseDateFlagOrUndefined(options.startedBefore),
      stopped_after: parseDateFlagOrUndefined(options.stoppedAfter),
      stopped_before: parseDateFlagOrUndefined(options.stoppedBefore),
      analysis_type: options.analysisType,
      running_type: options.runningType,
      alert_srm: options.alertSrm,
      alert_cleanup_needed: options.alertCleanupNeeded,
      alert_audience_mismatch: options.alertAudienceMismatch,
      alert_sample_size_reached: options.alertSampleSizeReached,
      alert_experiments_interact: options.alertExperimentsInteract,
      alert_group_sequential_updated: options.alertGroupSequentialUpdated,
      alert_assignment_conflict: options.alertAssignmentConflict,
      alert_metric_threshold_reached: options.alertMetricThresholdReached,
      significance: options.significance,
    };

    const experiments = await client.listExperiments(listOptions);
    printFormatted(experiments, globalOptions);
  }));
