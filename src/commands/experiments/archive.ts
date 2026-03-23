import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { isStdinPiped, isStdoutPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';
import { resolveNote } from './resolve-note.js';
import { getDefaultType } from './default-type.js';

export const archiveCommand = new Command('archive')
  .description('Archive or unarchive experiment(s). Reads IDs from stdin when piped.')
  .argument('[id]', 'experiment ID or name', parseExperimentIdOrName)
  .option('--unarchive', 'unarchive the experiment')
  .option('--note <text>', 'activity log note')
  .option('-i, --interactive', 'prompt for note interactively')
  .action(withErrorHandling(async (nameOrId: string | undefined, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const ids: string[] = nameOrId ? [nameOrId] : isStdinPiped() ? await readLinesFromStdin() : [];
    if (ids.length === 0) throw new Error('Provide an experiment ID or pipe IDs from stdin');
    const outputPiped = isStdoutPiped();
    const actionType = options.unarchive ? 'unarchive' : 'archive';
    const actionLabel = options.unarchive ? 'unarchived' : 'archived';

    const note = await resolveNote(options, actionType, getDefaultType(), globalOptions.profile);

    for (const idStr of ids) {
      const id = await client.resolveExperimentId(idStr);
      await client.archiveExperiment(id, options.unarchive, note);
      if (outputPiped) {
        console.log(id);
        console.error(chalk.green(`✓ Experiment ${id} ${actionLabel}`));
      } else {
        console.log(chalk.green(`✓ Experiment ${id} ${actionLabel}`));
      }
    }
  }));
