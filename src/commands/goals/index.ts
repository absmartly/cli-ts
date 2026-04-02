import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseGoalId } from '../../lib/utils/validators.js';
import type { GoalId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeGoal, summarizeGoalRow } from '../../api-client/entity-summary.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import { getGoal } from '../../core/goals/get.js';
import { createGoal } from '../../core/goals/create.js';
import { updateGoal } from '../../core/goals/update.js';
import { accessCommand } from './access.js';
import { followCommand, unfollowCommand } from './follow.js';

export const goalsCommand = new Command('goals').alias('goal').description('Goal commands');

const listCommand = createListCommand({
  description: 'List all goals',
  fetch: (client, options) => client.listGoals(options.items as number, options.page as number),
  summarizeRow: summarizeGoalRow,
});

const getCommand = new Command('get')
  .description('Get goal details')
  .argument('<id>', 'goal ID', parseGoalId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(withErrorHandling(async (id: GoalId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const result = await getGoal(client, { id });
    const data = globalOptions.raw ? result.data : applyShowExclude(summarizeGoal(result.data as Record<string, unknown>), result.data as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new goal')
  .requiredOption('--name <name>', 'goal name')
  .option('--description <text>', 'goal description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const result = await createGoal(client, {
      name: options.name,
      description: options.description,
    });

    console.log(chalk.green(`✓ Goal created with ID: ${result.data.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: GoalId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await updateGoal(client, {
      id,
      description: options.description,
    });
    console.log(chalk.green(`✓ Goal ${id} updated`));
  }));

goalsCommand.addCommand(listCommand);
goalsCommand.addCommand(getCommand);
goalsCommand.addCommand(createCommand);
goalsCommand.addCommand(updateCommand);
goalsCommand.addCommand(accessCommand);
goalsCommand.addCommand(followCommand);
goalsCommand.addCommand(unfollowCommand);
