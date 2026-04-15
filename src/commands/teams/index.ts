import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseTeamId } from '../../lib/utils/validators.js';
import { summarizeTeamRow } from '../../api-client/entity-summary.js';
import { createListCommand } from '../../lib/utils/list-command.js';
import type { TeamId } from '../../lib/api/branded-types.js';
import { getTeam } from '../../core/teams/get.js';
import { createTeam } from '../../core/teams/create.js';
import { updateTeam } from '../../core/teams/update.js';
import { archiveTeam } from '../../core/teams/archive.js';

export const teamsCommand = new Command('teams').alias('team').description('Team commands');

const listCommand = createListCommand({
  description: 'List all teams',
  fetch: (client, options) =>
    client.listTeams({
      includeArchived: options.includeArchived as boolean,
      items: options.items as number,
      page: options.page as number,
    }),
  summarizeRow: summarizeTeamRow,
  extraOptions: (cmd) => cmd.option('--include-archived', 'include archived teams'),
});

const getCommand = new Command('get')
  .description('Get team details')
  .argument('<id>', 'team ID', parseTeamId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .action(
    withErrorHandling(async (id: TeamId, options) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const show = (options.show as string[] | undefined) ?? [];
      const exclude = (options.exclude as string[] | undefined) ?? [];
      const result = await getTeam(client, { id, show, exclude, raw: globalOptions.raw });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new team')
  .requiredOption('--name <name>', 'team name')
  .option('--description <text>', 'team description')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createTeam(client, {
        name: options.name,
        description: options.description,
      });
      console.log(
        chalk.green(`✓ Team created with ID: ${(result.data as Record<string, unknown>).id}`)
      );
    })
  );

const updateCommand = new Command('update')
  .description('Update a team')
  .argument('<id>', 'team ID', parseTeamId)
  .option('--description <text>', 'new description')
  .action(
    withErrorHandling(async (id: TeamId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await updateTeam(client, { id, description: options.description });
      console.log(chalk.green(`✓ Team ${id} updated`));
    })
  );

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a team')
  .argument('<id>', 'team ID', parseTeamId)
  .option('--unarchive', 'unarchive the team')
  .action(
    withErrorHandling(async (id: TeamId, options) => {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await archiveTeam(client, { id, unarchive: options.unarchive });
      const action = options.unarchive ? 'unarchived' : 'archived';
      console.log(chalk.green(`✓ Team ${id} ${action}`));
    })
  );

import { membersCommand } from './members.js';

teamsCommand.addCommand(listCommand);
teamsCommand.addCommand(getCommand);
teamsCommand.addCommand(createCommand);
teamsCommand.addCommand(updateCommand);
teamsCommand.addCommand(archiveCommand);
teamsCommand.addCommand(membersCommand);
