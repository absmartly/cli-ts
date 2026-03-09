import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseGoalId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { GoalId } from '../../lib/api/branded-types.js';

export const goalsCommand = new Command('goals').alias('goal').description('Goal commands');

const listCommand = new Command('list')
  .description('List all goals')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const goals = await client.listGoals(options.limit, options.offset);
    printFormatted(goals, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get goal details')
  .argument('<id>', 'goal ID', parseGoalId)
  .action(withErrorHandling(async (id: GoalId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const goal = await client.getGoal(id);
    printFormatted(goal, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new goal')
  .requiredOption('--name <name>', 'goal name')
  .option('--description <text>', 'goal description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const goal = await client.createGoal({
      name: options.name,
      description: options.description,
    });

    console.log(chalk.green(`✓ Goal created with ID: ${goal.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: GoalId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.description !== undefined) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateGoal(id, data);
    console.log(chalk.green(`✓ Goal ${id} updated`));
  }));

goalsCommand.addCommand(listCommand);
goalsCommand.addCommand(getCommand);
goalsCommand.addCommand(createCommand);
goalsCommand.addCommand(updateCommand);
