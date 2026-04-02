import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseGoalId, parseUserId, parseTeamId, parseAssetRoleId } from '../../lib/utils/validators.js';
import type { GoalId, UserId, TeamId, AssetRoleId } from '../../lib/api/branded-types.js';
import {
  listGoalAccessUsers,
  grantGoalAccessUser,
  revokeGoalAccessUser,
  listGoalAccessTeams,
  grantGoalAccessTeam,
  revokeGoalAccessTeam,
} from '../../core/goals/access.js';

export const accessCommand = new Command('access').description('Manage goal access control');

const listUsersCommand = new Command('list-users')
  .description('List users with access to a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .action(withErrorHandling(async (id: GoalId) => {
    const globalOptions = getGlobalOptions(listUsersCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listGoalAccessUsers(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const grantUserCommand = new Command('grant-user')
  .description('Grant user access to a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .requiredOption('--user <userId>', 'user ID', parseUserId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: GoalId, options: { user: UserId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(grantUserCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await grantGoalAccessUser(client, { id, userId: options.user, roleId: options.role });
    console.log(chalk.green(`✓ User ${options.user} granted access to goal ${id}`));
  }));

const revokeUserCommand = new Command('revoke-user')
  .description('Revoke user access from a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .requiredOption('--user <userId>', 'user ID', parseUserId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: GoalId, options: { user: UserId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(revokeUserCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await revokeGoalAccessUser(client, { id, userId: options.user, roleId: options.role });
    console.log(chalk.green(`✓ User ${options.user} access revoked from goal ${id}`));
  }));

const listTeamsCommand = new Command('list-teams')
  .description('List teams with access to a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .action(withErrorHandling(async (id: GoalId) => {
    const globalOptions = getGlobalOptions(listTeamsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listGoalAccessTeams(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const grantTeamCommand = new Command('grant-team')
  .description('Grant team access to a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .requiredOption('--team <teamId>', 'team ID', parseTeamId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: GoalId, options: { team: TeamId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(grantTeamCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await grantGoalAccessTeam(client, { id, teamId: options.team, roleId: options.role });
    console.log(chalk.green(`✓ Team ${options.team} granted access to goal ${id}`));
  }));

const revokeTeamCommand = new Command('revoke-team')
  .description('Revoke team access from a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .requiredOption('--team <teamId>', 'team ID', parseTeamId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: GoalId, options: { team: TeamId; role: AssetRoleId }) => {
    const globalOptions = getGlobalOptions(revokeTeamCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await revokeGoalAccessTeam(client, { id, teamId: options.team, roleId: options.role });
    console.log(chalk.green(`✓ Team ${options.team} access revoked from goal ${id}`));
  }));

accessCommand.addCommand(listUsersCommand);
accessCommand.addCommand(grantUserCommand);
accessCommand.addCommand(revokeUserCommand);
accessCommand.addCommand(listTeamsCommand);
accessCommand.addCommand(grantTeamCommand);
accessCommand.addCommand(revokeTeamCommand);
