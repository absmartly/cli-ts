import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseTeamId, parseUserId, parseRoleId } from '../../lib/utils/validators.js';
import type { TeamId, UserId, RoleId } from '../../lib/api/branded-types.js';
import { listTeamMembers, addTeamMembers, editTeamMemberRoles, removeTeamMembers } from '../../core/teams/members.js';

function parseCommaSeparatedIds<T extends number>(
  value: string,
  parser: (v: string) => T
): T[] {
  return value.split(',').map((v) => parser(v.trim()));
}

export const membersCommand = new Command('members').description('Team member operations');

const listMembersCommand = new Command('list')
  .description('List team members')
  .argument('<id>', 'team ID', parseTeamId)
  .action(withErrorHandling(async (id: TeamId) => {
    const globalOptions = getGlobalOptions(listMembersCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listTeamMembers(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const addMembersCommand = new Command('add')
  .description('Add members to a team')
  .argument('<id>', 'team ID', parseTeamId)
  .requiredOption('--users <ids>', 'comma-separated user IDs')
  .option('--roles <ids>', 'comma-separated role IDs')
  .action(withErrorHandling(async (id: TeamId, options) => {
    const globalOptions = getGlobalOptions(addMembersCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const userIds = parseCommaSeparatedIds<UserId>(options.users, parseUserId);
    const roleIds = options.roles ? parseCommaSeparatedIds<RoleId>(options.roles, parseRoleId) : undefined;
    await addTeamMembers(client, { id, userIds, roleIds });
    console.log(chalk.green(`✓ Added ${userIds.length} member(s) to team ${id}`));
  }));

const editRolesCommand = new Command('edit-roles')
  .description('Edit roles for team members')
  .argument('<id>', 'team ID', parseTeamId)
  .requiredOption('--users <ids>', 'comma-separated user IDs')
  .requiredOption('--roles <ids>', 'comma-separated role IDs')
  .action(withErrorHandling(async (id: TeamId, options) => {
    const globalOptions = getGlobalOptions(editRolesCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const userIds = parseCommaSeparatedIds<UserId>(options.users, parseUserId);
    const roleIds = parseCommaSeparatedIds<RoleId>(options.roles, parseRoleId);
    await editTeamMemberRoles(client, { id, userIds, roleIds });
    console.log(chalk.green(`✓ Updated roles for ${userIds.length} member(s) in team ${id}`));
  }));

const removeMembersCommand = new Command('remove')
  .description('Remove members from a team')
  .argument('<id>', 'team ID', parseTeamId)
  .requiredOption('--users <ids>', 'comma-separated user IDs')
  .action(withErrorHandling(async (id: TeamId, options) => {
    const globalOptions = getGlobalOptions(removeMembersCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const userIds = parseCommaSeparatedIds<UserId>(options.users, parseUserId);
    await removeTeamMembers(client, { id, userIds });
    console.log(chalk.green(`✓ Removed ${userIds.length} member(s) from team ${id}`));
  }));

membersCommand.addCommand(listMembersCommand);
membersCommand.addCommand(addMembersCommand);
membersCommand.addCommand(editRolesCommand);
membersCommand.addCommand(removeMembersCommand);
