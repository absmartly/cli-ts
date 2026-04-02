import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseMetricId } from '../../lib/utils/validators.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';
import { addFavorite as coreAddFavorite, removeFavorite as coreRemoveFavorite } from '../../core/favorites/favorites.js';

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

    let id: number;
    if (type === 'experiment') {
      id = parseExperimentId(idStr) as ExperimentId;
    } else if (type === 'metric') {
      id = parseMetricId(idStr) as MetricId;
    } else {
      throw new Error(`Invalid type "${type}". Must be "experiment" or "metric".`);
    }

    await coreAddFavorite(client, { type, id });
    console.log(chalk.green(`✓ Added ${type} ${id} to favorites`));
  }));

const removeCommand = new Command('remove')
  .description('Remove an experiment or metric from favorites')
  .argument('<type>', 'type: experiment or metric')
  .argument('<id>', 'entity ID')
  .action(withErrorHandling(async (type: string, idStr: string) => {
    const globalOptions = getGlobalOptions(removeCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let id: number;
    if (type === 'experiment') {
      id = parseExperimentId(idStr) as ExperimentId;
    } else if (type === 'metric') {
      id = parseMetricId(idStr) as MetricId;
    } else {
      throw new Error(`Invalid type "${type}". Must be "experiment" or "metric".`);
    }

    await coreRemoveFavorite(client, { type, id });
    console.log(chalk.green(`✓ Removed ${type} ${id} from favorites`));
  }));

favoritesCommand.addCommand(addCommand);
favoritesCommand.addCommand(removeCommand);
