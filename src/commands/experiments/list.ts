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

    const createdAfter = parseDateFlagOrUndefined(options.createdAfter);
    const createdBefore = parseDateFlagOrUndefined(options.createdBefore);
    const startedAfter = parseDateFlagOrUndefined(options.startedAfter);
    const startedBefore = parseDateFlagOrUndefined(options.startedBefore);
    const stoppedAfter = parseDateFlagOrUndefined(options.stoppedAfter);
    const stoppedBefore = parseDateFlagOrUndefined(options.stoppedBefore);

    const listOptions: ListOptions = {
      limit,
      offset,
      ...(options.app && { application: options.app }),
      ...(options.state && { state: options.state }),
      ...(options.type && { type: options.type }),
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
    printFormatted(experiments, globalOptions);
  }));
