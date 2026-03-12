import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseMetricId } from '../../lib/utils/validators.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';

export const favoritesCommand = new Command('favorites')
  .alias('favorite')
  .alias('fav')
  .description('Favorites commands');

const addCommand = new Command('add')
  .description('Add an experiment or metric to favorites')
  .argument('<type>', 'type: experiment or metric')
  .argument('<id>', 'entity ID')
  .action(withErrorHandling(async (type: string, idStr: string) => {
    const globalOptions = getGlobalOptions(addCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    if (type === 'experiment') {
      const id = parseExperimentId(idStr) as ExperimentId;
      await client.favoriteExperiment(id, true);
      console.log(chalk.green(`✓ Added experiment ${id} to favorites`));
    } else if (type === 'metric') {
      const id = parseMetricId(idStr) as MetricId;
      await client.favoriteMetric(id, true);
      console.log(chalk.green(`✓ Added metric ${id} to favorites`));
    } else {
      throw new Error(`Invalid type "${type}". Must be "experiment" or "metric".`);
    }
  }));

const removeCommand = new Command('remove')
  .description('Remove an experiment or metric from favorites')
  .argument('<type>', 'type: experiment or metric')
  .argument('<id>', 'entity ID')
  .action(withErrorHandling(async (type: string, idStr: string) => {
    const globalOptions = getGlobalOptions(removeCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    if (type === 'experiment') {
      const id = parseExperimentId(idStr) as ExperimentId;
      await client.favoriteExperiment(id, false);
      console.log(chalk.green(`✓ Removed experiment ${id} from favorites`));
    } else if (type === 'metric') {
      const id = parseMetricId(idStr) as MetricId;
      await client.favoriteMetric(id, false);
      console.log(chalk.green(`✓ Removed metric ${id} from favorites`));
    } else {
      throw new Error(`Invalid type "${type}". Must be "experiment" or "metric".`);
    }
  }));

favoritesCommand.addCommand(addCommand);
favoritesCommand.addCommand(removeCommand);
