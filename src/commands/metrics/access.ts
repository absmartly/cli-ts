import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import {
  parseMetricId,
  parseUserId,
  parseTeamId,
  parseAssetRoleId,
} from '../../lib/utils/validators.js';
import type { MetricId, UserId, TeamId, AssetRoleId } from '../../lib/api/branded-types.js';
import {
  listMetricAccessUsers,
  grantMetricAccessUser,
  revokeMetricAccessUser,
  listMetricAccessTeams,
  grantMetricAccessTeam,
  revokeMetricAccessTeam,
} from '../../core/metrics/access.js';

export const accessCommand = new Command('access').description('Manage metric access control');

const listUsersCommand = new Command('list-users')
  .description('List users with access to a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(listUsersCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await listMetricAccessUsers(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const grantUserCommand = new Command('grant-user')
  .description('Grant user access to a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--user <userId>', 'user ID', parseUserId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(
    withErrorHandling(async (id: MetricId, options: { user: UserId; role: AssetRoleId }) => {
      const globalOptions = getGlobalOptions(grantUserCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await grantMetricAccessUser(client, { id, userId: options.user, roleId: options.role });
      console.log(chalk.green(`✓ User ${options.user} granted access to metric ${id}`));
    })
  );

const revokeUserCommand = new Command('revoke-user')
  .description('Revoke user access from a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--user <userId>', 'user ID', parseUserId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(
    withErrorHandling(async (id: MetricId, options: { user: UserId; role: AssetRoleId }) => {
      const globalOptions = getGlobalOptions(revokeUserCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await revokeMetricAccessUser(client, { id, userId: options.user, roleId: options.role });
      console.log(chalk.green(`✓ User ${options.user} access revoked from metric ${id}`));
    })
  );

const listTeamsCommand = new Command('list-teams')
  .description('List teams with access to a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(listTeamsCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await listMetricAccessTeams(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const grantTeamCommand = new Command('grant-team')
  .description('Grant team access to a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--team <teamId>', 'team ID', parseTeamId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(
    withErrorHandling(async (id: MetricId, options: { team: TeamId; role: AssetRoleId }) => {
      const globalOptions = getGlobalOptions(grantTeamCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await grantMetricAccessTeam(client, { id, teamId: options.team, roleId: options.role });
      console.log(chalk.green(`✓ Team ${options.team} granted access to metric ${id}`));
    })
  );

const revokeTeamCommand = new Command('revoke-team')
  .description('Revoke team access from a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--team <teamId>', 'team ID', parseTeamId)
  .requiredOption('--role <assetRoleId>', 'asset role ID', parseAssetRoleId)
  .action(
    withErrorHandling(async (id: MetricId, options: { team: TeamId; role: AssetRoleId }) => {
      const globalOptions = getGlobalOptions(revokeTeamCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await revokeMetricAccessTeam(client, { id, teamId: options.team, roleId: options.role });
      console.log(chalk.green(`✓ Team ${options.team} access revoked from metric ${id}`));
    })
  );

accessCommand.addCommand(listUsersCommand);
accessCommand.addCommand(grantUserCommand);
accessCommand.addCommand(revokeUserCommand);
accessCommand.addCommand(listTeamsCommand);
accessCommand.addCommand(grantTeamCommand);
accessCommand.addCommand(revokeTeamCommand);
