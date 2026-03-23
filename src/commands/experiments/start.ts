import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { isStdinPiped, isStdoutPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';
import { resolveNote } from './resolve-note.js';
import { getDefaultType } from './default-type.js';

export const startCommand = new Command('start')
  .description('Start experiment(s). Reads IDs from stdin when piped.')
  .argument('[id]', 'experiment ID or name', parseExperimentIdOrName)
  .option('--note <text>', 'activity log note')
  .option('-i, --interactive', 'prompt for note interactively')
  .action(withErrorHandling(async (nameOrId: string | undefined, options) => {
    const globalOptions = getGlobalOptions(startCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const ids: string[] = nameOrId ? [nameOrId] : isStdinPiped() ? await readLinesFromStdin() : [];
    if (ids.length === 0) throw new Error('Provide an experiment ID or pipe IDs from stdin');
    const outputPiped = isStdoutPiped();

    const note = await resolveNote(options, 'start', getDefaultType(), globalOptions.profile);

    for (const idStr of ids) {
      const id = await client.resolveExperimentId(idStr);
      const experiment = await client.getExperiment(id);
      if (experiment.state === 'created') {
        console.error(chalk.yellow(`⚠ Experiment ${id} is in draft state, skipping`));
        continue;
      }
      await client.startExperiment(id, note);
      if (outputPiped) {
        console.log(id);
        console.error(chalk.green(`✓ Experiment ${id} started`));
      } else {
        console.log(chalk.green(`✓ Experiment ${id} started`));
      }
    }
  }));
