import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseId, requireAtLeastOneField } from '../../lib/utils/validators.js';

export const teamsCommand = new Command('teams').alias('team').description('Team commands');

const listCommand = new Command('list')
  .description('List all teams')
  .option('--include-archived', 'include archived teams')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const teams = await client.listTeams(options.includeArchived);
    printFormatted(teams, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get team details')
  .argument('<id>', 'team ID', parseId)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const team = await client.getTeam(id);
    printFormatted(team, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new team')
  .requiredOption('--name <name>', 'team name')
  .option('--description <text>', 'team description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const team = await client.createTeam({
      name: options.name,
      description: options.description,
    });

    console.log(chalk.green(`✓ Team created with ID: ${team.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a team')
  .argument('<id>', 'team ID', parseId)
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.description) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateTeam(id, data);
    console.log(chalk.green(`✓ Team ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a team')
  .argument('<id>', 'team ID', parseId)
  .option('--unarchive', 'unarchive the team')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveTeam(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Team ${id} ${action}`));
  }));

teamsCommand.addCommand(listCommand);
teamsCommand.addCommand(getCommand);
teamsCommand.addCommand(createCommand);
teamsCommand.addCommand(updateCommand);
teamsCommand.addCommand(archiveCommand);
