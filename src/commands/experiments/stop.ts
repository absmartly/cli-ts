import { Command } from 'commander';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { isStdinPiped, isStdoutPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';
import { resolveNote } from './resolve-note.js';
import { getDefaultType } from './default-type.js';

const VALID_REASONS = [
  'hypothesis_rejected', 'hypothesis_iteration', 'user_feedback', 'data_issue',
  'implementation_issue', 'experiment_setup_issue', 'guardrail_metric_impact',
  'secondary_metric_impact', 'operational_decision', 'performance_issue',
  'testing', 'tracking_issue', 'code_cleaned_up', 'other',
] as const;

export const stopCommand = new Command('stop')
  .description('Stop experiment(s). Reads IDs from stdin when piped.')
  .argument('[id]', 'experiment ID or name', parseExperimentIdOrName)
  .option('--reason <reason>', 'reason for stopping')
  .option('--note <text>', 'activity log note')
  .option('-i, --interactive', 'prompt for note and reason interactively')
  .action(withErrorHandling(async (nameOrId: string | undefined, options) => {
    const globalOptions = getGlobalOptions(stopCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const ids: string[] = nameOrId ? [nameOrId] : isStdinPiped() ? await readLinesFromStdin() : [];
    if (ids.length === 0) throw new Error('Provide an experiment ID or pipe IDs from stdin');
    const outputPiped = isStdoutPiped();

    const reason = options.reason || (options.interactive ? await select({
      message: 'Reason for stopping',
      choices: VALID_REASONS.map(r => ({ value: r, name: r.replace(/_/g, ' ') })),
    }) : 'other');

    const note = await resolveNote(options, 'stop', getDefaultType(), globalOptions.profile);

    for (const idStr of ids) {
      const id = await client.resolveExperimentId(idStr);
      await client.stopExperiment(id, reason, note);
      if (outputPiped) {
        console.log(id);
        console.error(chalk.green(`✓ Experiment ${id} stopped`));
      } else {
        console.log(chalk.green(`✓ Experiment ${id} stopped`));
      }
    }
  }));
