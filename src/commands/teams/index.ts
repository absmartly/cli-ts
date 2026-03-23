import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseTeamId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { applyShowExclude, summarizeTeam, summarizeTeamRow } from '../../api-client/entity-summary.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { TeamId } from '../../lib/api/branded-types.js';

export const teamsCommand = new Command('teams').alias('team').description('Team commands');

const listCommand = createListCommand({
  description: 'List all teams',
  fetch: (client, options) => client.listTeams(options.includeArchived as boolean, options.items as number, options.page as number),
  summarizeRow: summarizeTeamRow,
  extraOptions: (cmd) => cmd.option('--include-archived', 'include archived teams'),
});

const getCommand = new Command('get')
  .description('Get team details')
  .argument('<id>', 'team ID', parseTeamId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(withErrorHandling(async (id: TeamId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const team = await client.getTeam(id);
    const data = globalOptions.raw ? team : applyShowExclude(summarizeTeam(team as Record<string, unknown>), team as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);
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
  .argument('<id>', 'team ID', parseTeamId)
  .option('--description <text>', 'new description')
  .action(withErrorHandling(async (id: TeamId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.description !== undefined) data.description = options.description;

    requireAtLeastOneField(data, 'update field');
    await client.updateTeam(id, data);
    console.log(chalk.green(`✓ Team ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a team')
  .argument('<id>', 'team ID', parseTeamId)
  .option('--unarchive', 'unarchive the team')
  .action(withErrorHandling(async (id: TeamId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveTeam(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Team ${id} ${action}`));
  }));

import { membersCommand } from './members.js';

teamsCommand.addCommand(listCommand);
teamsCommand.addCommand(getCommand);
teamsCommand.addCommand(createCommand);
teamsCommand.addCommand(updateCommand);
teamsCommand.addCommand(archiveCommand);
teamsCommand.addCommand(membersCommand);
