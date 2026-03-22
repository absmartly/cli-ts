import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { printPaginationFooter } from '../../lib/utils/pagination.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import type { ListOptions } from '../../lib/api/types.js';
import { summarizeExperimentRow } from '../../api-client/experiment-summary.js';
import { getDefaultType } from './default-type.js';

export const listCommand = new Command('list')
  .description('List experiments')
  .option('--state <state>', 'filter by state (created, ready, running, development, full_on, stopped, archived)')
  .option('--type <type>', 'filter by type (test, feature)')
  .option('--app <app>', 'filter by application name')
  .option('--applications <ids>', 'filter by application IDs (comma-separated)')
  .option('--search <query>', 'search by name or display name')
  .option('--unit-types <ids>', 'filter by unit types (comma-separated IDs)')
  .option('--owners <ids>', 'filter by owner user IDs (comma-separated)')
  .option('--teams <ids>', 'filter by team IDs (comma-separated)')
  .option('--tags <ids>', 'filter by tag IDs (comma-separated)')
  .option('--ids <ids>', 'filter by experiment IDs (comma-separated)')
  .option('--impact <min,max>', 'filter by impact range (e.g. 1,5)')
  .option('--confidence <min,max>', 'filter by confidence range (e.g. 90,100)')
  .option('--significance <value>', 'filter by significance (positive, negative, neutral, inconclusive)')
  .option('--iterations <n>', 'filter by iteration count', (v) => parseInt(v, 10))
  .option('--iterations-of <id>', 'show all iterations of experiment ID', (v) => parseInt(v, 10))
  .option('--created-after <timestamp>', 'filter experiments created after timestamp')
  .option('--created-before <timestamp>', 'filter experiments created before timestamp')
  .option('--started-after <timestamp>', 'filter experiments started after timestamp')
  .option('--started-before <timestamp>', 'filter experiments started before timestamp')
  .option('--stopped-after <timestamp>', 'filter experiments stopped after timestamp')
  .option('--stopped-before <timestamp>', 'filter experiments stopped before timestamp')
  .option('--analysis-type <type>', 'filter by analysis type (fixed_horizon, group_sequential)')
  .option('--running-type <type>', 'filter by running type (full_on, experiment)')
  .option('--alert-srm [0|1]', 'filter by sample ratio mismatch alert')
  .option('--alert-cleanup-needed [0|1]', 'filter by cleanup needed alert')
  .option('--alert-audience-mismatch [0|1]', 'filter by audience mismatch alert')
  .option('--alert-sample-size-reached [0|1]', 'filter by sample size reached alert')
  .option('--alert-experiments-interact [0|1]', 'filter by experiments interact alert')
  .option('--alert-group-sequential-updated [0|1]', 'filter by group sequential updated alert')
  .option('--alert-assignment-conflict [0|1]', 'filter by assignment conflict alert')
  .option('--alert-metric-threshold-reached [0|1]', 'filter by metric threshold reached alert')
  .option('--items <number>', 'number of results per page', (v) => parseInt(v, 10), 20)
  .option('--page <number>', 'page number (default: 1)', (v) => parseInt(v, 10), 1)
  .option('--sort <field>', 'sort by field (e.g. created_at, name, state)')
  .option('--asc', 'sort in ascending order')
  .option('--desc', 'sort in descending order')
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields (e.g. --show experiment_report archived)')
  .option('--exclude <fields...>', 'hide fields (e.g. --exclude primary_metric owner)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const alertFlag = (v: unknown): number | undefined => {
      if (v === undefined) return undefined;
      if (v === true) return 1;
      return v === '0' ? 0 : 1;
    };

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
      ...(options.applications && { applications: options.applications }),
      ...(options.state && { state: options.state }),
      type: options.type || getDefaultType(),
      ...(options.search && { search: options.search }),
      ...(options.unitTypes && { unit_types: options.unitTypes }),
      ...(options.owners && { owners: options.owners }),
      ...(options.teams && { teams: options.teams }),
      ...(options.tags && { tags: options.tags }),
      ...(options.ids && { ids: options.ids }),
      ...(options.impact && { impact: options.impact }),
      ...(options.confidence && { confidence: options.confidence }),
      ...(options.iterations !== undefined && { iterations: options.iterations }),
      ...(options.iterationsOf !== undefined && { iterations_of: options.iterationsOf }),
      ...(createdAfter !== undefined && { created_after: createdAfter }),
      ...(createdBefore !== undefined && { created_before: createdBefore }),
      ...(startedAfter !== undefined && { started_after: startedAfter }),
      ...(startedBefore !== undefined && { started_before: startedBefore }),
      ...(stoppedAfter !== undefined && { stopped_after: stoppedAfter }),
      ...(stoppedBefore !== undefined && { stopped_before: stoppedBefore }),
      ...(options.analysisType && { analysis_type: options.analysisType }),
      ...(options.runningType && { running_type: options.runningType }),
      ...(alertFlag(options.alertSrm) !== undefined && { alert_srm: alertFlag(options.alertSrm) }),
      ...(alertFlag(options.alertCleanupNeeded) !== undefined && { alert_cleanup_needed: alertFlag(options.alertCleanupNeeded) }),
      ...(alertFlag(options.alertAudienceMismatch) !== undefined && { alert_audience_mismatch: alertFlag(options.alertAudienceMismatch) }),
      ...(alertFlag(options.alertSampleSizeReached) !== undefined && { alert_sample_size_reached: alertFlag(options.alertSampleSizeReached) }),
      ...(alertFlag(options.alertExperimentsInteract) !== undefined && { alert_experiments_interact: alertFlag(options.alertExperimentsInteract) }),
      ...(alertFlag(options.alertGroupSequentialUpdated) !== undefined && { alert_group_sequential_updated: alertFlag(options.alertGroupSequentialUpdated) }),
      ...(alertFlag(options.alertAssignmentConflict) !== undefined && { alert_assignment_conflict: alertFlag(options.alertAssignmentConflict) }),
      ...(alertFlag(options.alertMetricThresholdReached) !== undefined && { alert_metric_threshold_reached: alertFlag(options.alertMetricThresholdReached) }),
      ...(options.significance && { significance: options.significance }),
    };

    const experiments = await client.listExperiments(listOptions);

    if (options.raw) {
      printFormatted(experiments, globalOptions);
    } else {
      const extraFields = (options.show as string[] | undefined) ?? [];
      const excludeFields = (options.exclude as string[] | undefined) ?? [];
      const rows = (experiments as Array<Record<string, unknown>>).map(e => summarizeExperimentRow(e, extraFields, excludeFields));
      printFormatted(rows, globalOptions);
    }

    printPaginationFooter(experiments.length, options.items, options.page);
  }));
