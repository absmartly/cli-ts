import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { isStdinPiped, isStdoutPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';
import { resolveNote } from './resolve-note.js';
import { getDefaultType } from './default-type.js';
import { archiveExperiment } from '../../core/experiments/archive.js';

export const archiveCommand = new Command('archive')
  .description('Archive or unarchive experiment(s). Reads IDs from stdin when piped.')
  .argument('[id]', 'experiment ID or name', parseExperimentIdOrName)
  .option('--unarchive', 'unarchive the experiment')
  .option('--note <text>', 'activity log note')
  .option('-i, --interactive', 'prompt for note interactively')
  .option('--pass-through', 'pass failed IDs through in pipe mode')
  .action(
    withErrorHandling(async (nameOrId: string | undefined, options) => {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const ids: string[] = nameOrId
        ? [nameOrId]
        : isStdinPiped()
          ? await readLinesFromStdin()
          : [];
      if (ids.length === 0) throw new Error('Provide an experiment ID or pipe IDs from stdin');
      const outputPiped = isStdoutPiped();
      const actionLabel = options.unarchive ? 'unarchived' : 'archived';

      const note = await resolveNote(
        options,
        options.unarchive ? 'unarchive' : 'archive',
        getDefaultType(),
        globalOptions.profile
      );

      let hasFailures = false;
      for (const idStr of ids) {
        try {
          const id = await client.resolveExperimentId(idStr);
          await archiveExperiment(client, { experimentId: id, unarchive: options.unarchive, note });
          if (outputPiped) {
            console.log(id);
            console.error(chalk.green(`✓ Experiment ${id} ${actionLabel}`));
          } else {
            console.log(chalk.green(`✓ Experiment ${id} ${actionLabel}`));
          }
        } catch (e) {
          hasFailures = true;
          if (outputPiped && options.passThrough) console.log(idStr);
          console.error(chalk.red(`✗ Experiment ${idStr}: ${e instanceof Error ? e.message : e}`));
        }
      }
      if (hasFailures) process.exitCode = 1;
    })
  );
