import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { isStdinPiped, isStdoutPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';

export const archiveCommand = new Command('archive')
  .description('Archive or unarchive experiment(s). Reads IDs from stdin when piped.')
  .argument('[id]', 'experiment ID or name', parseExperimentIdOrName)
  .option('--unarchive', 'unarchive the experiment')
  .option('--note <text>', 'activity log note')
  .action(withErrorHandling(async (nameOrId: string | undefined, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const ids: string[] = nameOrId ? [nameOrId] : isStdinPiped() ? await readLinesFromStdin() : [];
    if (ids.length === 0) throw new Error('Provide an experiment ID or pipe IDs from stdin');
    const outputPiped = isStdoutPiped();
    const action = options.unarchive ? 'unarchived' : 'archived';

    for (const idStr of ids) {
      const id = await client.resolveExperimentId(idStr);
      await client.archiveExperiment(id, options.unarchive, options.note);
      if (outputPiped) {
        console.log(id);
        console.error(chalk.green(`✓ Experiment ${id} ${action}`));
      } else {
        console.log(chalk.green(`✓ Experiment ${id} ${action}`));
      }
    }
  }));
