import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

const VALID_TASKS = [
  'preview_metrics',
  'preview_summary',
  'preview_group_sequential',
  'preview_report_metrics',
  'preview_participants_history',
  'check_cleanup_needed',
  'check_audience_mismatch',
  'check_sample_size',
  'check_sample_ratio_mismatch',
  'check_interactions',
  'check_assignment_conflict',
  'check_metric_threshold',
];

function parseTasks(value: string): string[] {
  const tasks = value.split(',').map(t => t.trim()).filter(Boolean);
  for (const task of tasks) {
    if (!VALID_TASKS.includes(task)) {
      throw new Error(`Invalid task: "${task}". Valid tasks: ${VALID_TASKS.join(', ')}`);
    }
  }
  return tasks;
}

export const requestUpdateCommand = new Command('request-update')
  .description('Request analysis update for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--tasks <tasks>', 'run only specific tasks (comma-separated)', parseTasks)
  .option('--replace-gsa', 'replace group sequential analysis')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(requestUpdateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let params: { replaceGroupSequentialAnalysis?: boolean; tasks?: string[] } | undefined;
    if (options.tasks || options.replaceGsa) {
      params = {};
      if (options.tasks) params.tasks = options.tasks;
      if (options.replaceGsa) params.replaceGroupSequentialAnalysis = true;
    }

    await client.requestExperimentUpdate(id, params);
    console.log(chalk.green(`✓ Analysis update requested for experiment ${id}`));
  }));
