import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { isStdinPiped, isStdoutPiped, readLinesFromStdin } from '../../lib/utils/stdin.js';

export const developmentCommand = new Command('development')
  .alias('dev')
  .description('Put experiment(s) into development mode. Reads IDs from stdin when piped.')
  .argument('[id]', 'experiment ID or name', parseExperimentIdOrName)
  .option('--note <text>', 'note about the action', 'Started development via CLI')
  .action(withErrorHandling(async (nameOrId: string | undefined, options) => {
    const globalOptions = getGlobalOptions(developmentCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const ids: string[] = nameOrId ? [nameOrId] : isStdinPiped() ? await readLinesFromStdin() : [];
    if (ids.length === 0) throw new Error('Provide an experiment ID or pipe IDs from stdin');
    const outputPiped = isStdoutPiped();

    for (const idStr of ids) {
      const id = await client.resolveExperimentId(idStr);
      await client.developmentExperiment(id, options.note);
      if (outputPiped) {
        console.log(id);
        console.error(chalk.green(`✓ Experiment ${id} set to development mode`));
      } else {
        console.log(chalk.green(`✓ Experiment ${id} set to development mode`));
      }
    }
  }));
