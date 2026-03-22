import { Command } from 'commander';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

const VALID_REASONS = [
  'hypothesis_rejected', 'hypothesis_iteration', 'user_feedback', 'data_issue',
  'implementation_issue', 'experiment_setup_issue', 'guardrail_metric_impact',
  'secondary_metric_impact', 'operational_decision', 'performance_issue',
  'testing', 'tracking_issue', 'code_cleaned_up', 'other',
] as const;

export const stopCommand = new Command('stop')
  .description('Stop experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--reason <reason>', 'reason for stopping')
  .option('--note <text>', 'activity log note')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(stopCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const reason = options.reason || await select({
      message: 'Reason for stopping',
      choices: VALID_REASONS.map(r => ({ value: r, name: r.replace(/_/g, ' ') })),
    });

    await client.stopExperiment(id, reason, options.note);
    console.log(chalk.green(`✓ Experiment ${id} stopped`));
  }));
