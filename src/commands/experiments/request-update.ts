import { Command, Option } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { requestUpdate, VALID_TASKS } from '../../core/experiments/request-update.js';

function parseTasks(value: string): string[] {
  const tasks = value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  for (const task of tasks) {
    if (!(VALID_TASKS as readonly string[]).includes(task)) {
      throw new Error(`Invalid task: "${task}". Valid tasks: ${VALID_TASKS.join(', ')}`);
    }
  }
  return tasks;
}

export const requestUpdateCommand = new Command('request-update')
  .description(
    'Request the previewer to re-evaluate an experiment.\n\n' +
      'Inserts a pending update request that the previewer picks up on its next loop.\n' +
      'Without options, all analysis tasks are re-run. Use --tasks to limit which\n' +
      'tasks execute, and --replace-gsa to recompute group sequential analysis\n' +
      'from scratch instead of incrementally.\n\n' +
      'Available tasks:\n' +
      '  preview_metrics                compute metric results\n' +
      '  preview_summary                compute experiment summary\n' +
      '  preview_group_sequential       compute group sequential boundaries\n' +
      '  preview_report_metrics         generate report metric data\n' +
      '  preview_participants_history   compute participant history over time\n' +
      '  check_cleanup_needed           check if experiment needs cleanup\n' +
      '  check_audience_mismatch        detect audience mismatch\n' +
      '  check_sample_size              check if sample size target is reached\n' +
      '  check_sample_ratio_mismatch    detect sample ratio mismatch (SRM)\n' +
      '  check_interactions             detect interactions between experiments\n' +
      '  check_assignment_conflict      detect assignment conflicts\n' +
      '  check_metric_threshold         check metric threshold alerts'
  )
  .argument('<id>', 'experiment ID', parseExperimentId)
  .addOption(
    Object.assign(
      new Option(
        '--tasks <tasks>',
        'comma-separated list of tasks to run (default: all)'
      ).argParser(parseTasks),
      { argChoices: VALID_TASKS }
    )
  )
  .option('--replace-gsa', 'recompute group sequential analysis from scratch')
  .action(
    withErrorHandling(async (id: ExperimentId, options) => {
      const globalOptions = getGlobalOptions(requestUpdateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await requestUpdate(client, {
        experimentId: id,
        tasks: options.tasks,
        replaceGsa: options.replaceGsa,
      });
      console.log(chalk.green(`✓ Analysis update requested for experiment ${id}`));
    })
  );
