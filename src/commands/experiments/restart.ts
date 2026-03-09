import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

const VALID_REASONS = [
  'hypothesis_rejected', 'hypothesis_iteration', 'user_feedback', 'data_issue',
  'implementation_issue', 'experiment_setup_issue', 'guardrail_metric_impact',
  'secondary_metric_impact', 'operational_decision', 'performance_issue',
  'testing', 'tracking_issue', 'code_cleaned_up', 'other',
] as const;

export const restartCommand = new Command('restart')
  .description('Restart a stopped experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--note <text>', 'note about the restart', 'Restarted via CLI')
  .option('--reason <reason>', `reason for restart (${VALID_REASONS.join(', ')})`)
  .option('--reshuffle', 'reshuffle variant assignments')
  .option('--state <state>', 'target state: running or development', 'running')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(restartCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    if (options.reason && !VALID_REASONS.includes(options.reason)) {
      throw new Error(
        `Invalid reason: "${options.reason}"\n` +
        `Valid reasons: ${VALID_REASONS.join(', ')}`
      );
    }

    if (options.state && !['running', 'development'].includes(options.state)) {
      throw new Error(
        `Invalid state: "${options.state}"\n` +
        `Valid states: running, development`
      );
    }

    const restartOptions: Parameters<typeof client.restartExperiment>[1] = { note: options.note };
    if (options.reason) restartOptions.reason = options.reason;
    if (options.reshuffle) restartOptions.reshuffle = true;
    if (options.state) restartOptions.state = options.state;

    await client.restartExperiment(id, restartOptions);
    console.log(chalk.green(`✓ Experiment ${id} restarted`));
  }));
