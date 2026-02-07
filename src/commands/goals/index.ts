import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId, requireAtLeastOneField } from '../../lib/utils/validators.js';

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
  .argument('<id>', 'goal ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const goal = await client.getGoal(id);
    printFormatted(goal, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new goal')
  .requiredOption('--name <name>', 'goal name')
  .option('--display-name <name>', 'display name')
  .option('--type <type>', 'goal type (conversion, revenue)')
  .option('--description <text>', 'goal description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const goal = await client.createGoal({
      name: options.name,
      display_name: options.displayName,
      type: options.type,
      description: options.description,
    });

    console.log(chalk.green(`✓ Goal created with ID: ${goal.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a goal')
  .argument('<id>', 'goal ID', parseId)
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.displayName) data.display_name = options.displayName;
    if (options.description) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateGoal(id, data);
    console.log(chalk.green(`✓ Goal ${id} updated`));
  }));

const deleteCommand = new Command('delete')
  .description('Delete a goal')
  .argument('<id>', 'goal ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteGoal(id);
    console.log(chalk.green(`✓ Goal ${id} deleted`));
  }));

goalsCommand.addCommand(listCommand);
goalsCommand.addCommand(getCommand);
goalsCommand.addCommand(createCommand);
goalsCommand.addCommand(updateCommand);
goalsCommand.addCommand(deleteCommand);
