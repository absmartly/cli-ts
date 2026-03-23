import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { isStdinPiped, isStdoutPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';
import { resolveNote } from './resolve-note.js';
import { getDefaultType } from './default-type.js';

export const fullOnCommand = new Command('full-on')
  .description('Set experiment(s) to full-on mode. Reads IDs from stdin when piped.')
  .argument('[id]', 'experiment ID or name', parseExperimentIdOrName)
  .requiredOption('--variant <number>', 'variant number to set as full-on (>= 1)', (v) => {
    const num = parseInt(v, 10);
    if (!Number.isInteger(num) || num < 1) {
      throw new Error(`Invalid variant: "${v}" must be an integer >= 1`);
    }
    return num;
  })
  .option('--note <text>', 'note about the action')
  .option('-i, --interactive', 'prompt for note interactively')
  .action(withErrorHandling(async (nameOrId: string | undefined, options) => {
    const globalOptions = getGlobalOptions(fullOnCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const ids: string[] = nameOrId ? [nameOrId] : isStdinPiped() ? await readLinesFromStdin() : [];
    if (ids.length === 0) throw new Error('Provide an experiment ID or pipe IDs from stdin');
    const outputPiped = isStdoutPiped();

    const note = await resolveNote(options, 'full_on', getDefaultType(), globalOptions.profile);

    for (const idStr of ids) {
      const id = await client.resolveExperimentId(idStr);
      await client.fullOnExperiment(id, options.variant, note);
      if (outputPiped) {
        console.log(id);
        console.error(chalk.green(`✓ Experiment ${id} set to full-on (variant ${options.variant})`));
      } else {
        console.log(chalk.green(`✓ Experiment ${id} set to full-on (variant ${options.variant})`));
      }
    }
  }));
