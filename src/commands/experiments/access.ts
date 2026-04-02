import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseUserId, parseTeamId, parseAssetRoleId } from '../../lib/utils/validators.js';
import type { ExperimentId, UserId, TeamId, AssetRoleId } from '../../lib/api/branded-types.js';
import {
  listExperimentAccessUsers,
  grantExperimentAccessUser,
  revokeExperimentAccessUser,
  listExperimentAccessTeams,
  grantExperimentAccessTeam,
  revokeExperimentAccessTeam,
} from '../../core/experiments/access.js';

export const accessCommand = new Command('access').description('Manage experiment access control');

const listUsersCommand = new Command('list-users')
  .description('List users with access to an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(listUsersCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listExperimentAccessUsers(client, { experimentId: id });
    printFormatted(result.data, globalOptions);
  }));

const grantUserCommand = new Command('grant-user')
  .description('Grant user access to an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--user <userId>', 'user ID', parseUserId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: ExperimentId, options: { user: UserId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(grantUserCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await grantExperimentAccessUser(client, { experimentId: id, userId: options.user, roleId: options.role });
    console.log(chalk.green(`✓ User ${options.user} granted access to experiment ${id}`));
  }));

const revokeUserCommand = new Command('revoke-user')
  .description('Revoke user access from an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--user <userId>', 'user ID', parseUserId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: ExperimentId, options: { user: UserId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(revokeUserCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await revokeExperimentAccessUser(client, { experimentId: id, userId: options.user, roleId: options.role });
    console.log(chalk.green(`✓ User ${options.user} access revoked from experiment ${id}`));
  }));

const listTeamsCommand = new Command('list-teams')
  .description('List teams with access to an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(listTeamsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listExperimentAccessTeams(client, { experimentId: id });
    printFormatted(result.data, globalOptions);
  }));

const grantTeamCommand = new Command('grant-team')
  .description('Grant team access to an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--team <teamId>', 'team ID', parseTeamId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: ExperimentId, options: { team: TeamId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(grantTeamCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await grantExperimentAccessTeam(client, { experimentId: id, teamId: options.team, roleId: options.role });
    console.log(chalk.green(`✓ Team ${options.team} granted access to experiment ${id}`));
  }));

const revokeTeamCommand = new Command('revoke-team')
  .description('Revoke team access from an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--team <teamId>', 'team ID', parseTeamId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: ExperimentId, options: { team: TeamId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(revokeTeamCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await revokeExperimentAccessTeam(client, { experimentId: id, teamId: options.team, roleId: options.role });
    console.log(chalk.green(`✓ Team ${options.team} access revoked from experiment ${id}`));
  }));

accessCommand.addCommand(listUsersCommand);
accessCommand.addCommand(grantUserCommand);
accessCommand.addCommand(revokeUserCommand);
accessCommand.addCommand(listTeamsCommand);
accessCommand.addCommand(grantTeamCommand);
accessCommand.addCommand(revokeTeamCommand);
