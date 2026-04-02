import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { printPaginationFooter } from '../../lib/utils/pagination.js';
import { getDefaultType } from './default-type.js';
import { isStdoutPiped } from '../../lib/utils/stdin.js';
import { listExperiments } from '../../core/experiments/list.js';

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
  .option('--show <fields...>', 'include additional fields (e.g. --show experiment_report archived)')
  .option('--exclude <fields...>', 'hide fields (e.g. --exclude primary_metric owner)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const result = await listExperiments(client, {
      ...options,
      type: options.type || getDefaultType(),
      raw: globalOptions.raw,
    });

    if (isStdoutPiped() && globalOptions.output === 'table') {
      for (const exp of result.data) console.log((exp as Record<string, unknown>).id);
      return;
    }

    if (globalOptions.raw) {
      printFormatted(result.data, globalOptions);
    } else {
      printFormatted(result.rows, globalOptions);
    }

    printPaginationFooter(result.data.length, options.items, options.page, globalOptions.output as string);
  }));
