import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseRecommendedActionId } from '../../lib/utils/validators.js';
import type { ExperimentId, RecommendedActionId } from '../../lib/api/branded-types.js';
import {
  listRecommendedActions,
  dismissRecommendedAction,
} from '../../core/experiments/recommendations.js';

export const recommendationsCommand = new Command('recommendations').description(
  'Experiment recommended action operations'
);

const listRecommendationsCommand = new Command('list')
  .description('List recommended actions for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .action(
    withErrorHandling(async (experimentId: ExperimentId) => {
      const globalOptions = getGlobalOptions(listRecommendationsCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const result = await listRecommendedActions(client, { experimentId });

      if (result.data.length === 0) {
        console.log(chalk.blue('ℹ No recommended actions found'));
        return;
      }

      printFormatted(result.data, globalOptions);
    })
  );

const dismissRecommendationCommand = new Command('dismiss')
  .description('Dismiss a recommended action')
  .argument('<actionId>', 'recommended action ID', parseRecommendedActionId)
  .action(
    withErrorHandling(async (actionId: RecommendedActionId) => {
      const globalOptions = getGlobalOptions(dismissRecommendationCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await dismissRecommendedAction(client, { actionId });
      console.log(chalk.green(`✓ Recommended action ${actionId} dismissed`));
    })
  );

recommendationsCommand.addCommand(listRecommendationsCommand);
recommendationsCommand.addCommand(dismissRecommendationCommand);
