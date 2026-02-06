import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const goalsCommand = new Command('goals').alias('goal').description('Goal commands');

const listCommand = new Command('list')
  .description('List all goals')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const goals = await client.listGoals(options.limit, options.offset);

      const output = formatOutput(goals, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const getCommand = new Command('get')
  .description('Get goal details')
  .argument('<id>', 'goal ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const goal = await client.getGoal(id);

      const output = formatOutput(goal, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const createCommand = new Command('create')
  .description('Create a new goal')
  .requiredOption('--name <name>', 'goal name')
  .option('--display-name <name>', 'display name')
  .option('--type <type>', 'goal type (conversion, revenue)')
  .option('--description <text>', 'goal description')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data = {
        name: options.name,
        display_name: options.displayName,
        type: options.type,
        description: options.description,
      };

      const goal = await client.createGoal(data);

      console.log(chalk.green(`✓ Goal created with ID: ${goal.id}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const updateCommand = new Command('update')
  .description('Update a goal')
  .argument('<id>', 'goal ID', parseInt)
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: Record<string, string> = {};
      if (options.displayName) data.display_name = options.displayName;
      if (options.description) data.description = options.description;

      await client.updateGoal(id, data);

      console.log(chalk.green(`✓ Goal ${id} updated`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const deleteCommand = new Command('delete')
  .description('Delete a goal')
  .argument('<id>', 'goal ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteGoal(id);

      console.log(chalk.green(`✓ Goal ${id} deleted`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

goalsCommand.addCommand(listCommand);
goalsCommand.addCommand(getCommand);
goalsCommand.addCommand(createCommand);
goalsCommand.addCommand(updateCommand);
goalsCommand.addCommand(deleteCommand);
