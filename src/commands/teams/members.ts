import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseTeamId } from '../../lib/utils/validators.js';
import type { TeamId, UserId, RoleId } from '../../lib/api/branded-types.js';
import {
  listTeamMembers,
  addTeamMembers,
  editTeamMemberRoles,
  removeTeamMembers,
} from '../../core/teams/members.js';
import { parseCSV } from '../../api-client/payload/parse-csv.js';
import { resolveByName } from '../../api-client/payload/resolver.js';

async function resolveUserValues(
  client: import('../../api-client/api-client.js').APIClient,
  raw: string
): Promise<UserId[]> {
  const refs = parseCSV(raw);
  const allNumeric = refs.every(
    (r) => !isNaN(parseInt(r, 10)) && String(parseInt(r, 10)) === r.trim()
  );
  if (allNumeric) return refs.map((r) => parseInt(r, 10) as UserId);
  const resolved = await client.resolveUsers(refs);
  return resolved.map((u) => u.id as UserId);
}

async function resolveRoleValues(
  client: import('../../api-client/api-client.js').APIClient,
  raw: string
): Promise<RoleId[]> {
  const refs = parseCSV(raw);
  const allNumeric = refs.every(
    (r) => !isNaN(parseInt(r, 10)) && String(parseInt(r, 10)) === r.trim()
  );
  if (allNumeric) return refs.map((r) => parseInt(r, 10) as RoleId);
  const roles = await client.listRoles();
  return refs.map((ref) => resolveByName(roles, ref, 'Role').id as RoleId);
}

export const membersCommand = new Command('members').description('Team member operations');

const listMembersCommand = new Command('list')
  .description('List team members')
  .argument('<id>', 'team ID', parseTeamId)
  .action(
    withErrorHandling(async (id: TeamId) => {
      const globalOptions = getGlobalOptions(listMembersCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await listTeamMembers(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const addMembersCommand = new Command('add')
  .description('Add members to a team')
  .argument('<id>', 'team ID', parseTeamId)
  .requiredOption('--users <values>', 'comma-separated user names, emails, or IDs')
  .option('--roles <values>', 'comma-separated role names or IDs')
  .action(
    withErrorHandling(async (id: TeamId, options) => {
      const globalOptions = getGlobalOptions(addMembersCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const userIds = await resolveUserValues(client, options.users);
      const roleIds = options.roles ? await resolveRoleValues(client, options.roles) : undefined;
      await addTeamMembers(client, { id, userIds, roleIds });
      console.log(chalk.green(`✓ Added ${userIds.length} member(s) to team ${id}`));
    })
  );

const editRolesCommand = new Command('edit-roles')
  .description('Edit roles for team members')
  .argument('<id>', 'team ID', parseTeamId)
  .requiredOption('--users <values>', 'comma-separated user names, emails, or IDs')
  .requiredOption('--roles <values>', 'comma-separated role names or IDs')
  .action(
    withErrorHandling(async (id: TeamId, options) => {
      const globalOptions = getGlobalOptions(editRolesCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const userIds = await resolveUserValues(client, options.users);
      const roleIds = await resolveRoleValues(client, options.roles);
      await editTeamMemberRoles(client, { id, userIds, roleIds });
      console.log(chalk.green(`✓ Updated roles for ${userIds.length} member(s) in team ${id}`));
    })
  );

const removeMembersCommand = new Command('remove')
  .description('Remove members from a team')
  .argument('<id>', 'team ID', parseTeamId)
  .requiredOption('--users <values>', 'comma-separated user names, emails, or IDs')
  .action(
    withErrorHandling(async (id: TeamId, options) => {
      const globalOptions = getGlobalOptions(removeMembersCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const userIds = await resolveUserValues(client, options.users);
      await removeTeamMembers(client, { id, userIds });
      console.log(chalk.green(`✓ Removed ${userIds.length} member(s) from team ${id}`));
    })
  );

membersCommand.addCommand(listMembersCommand);
membersCommand.addCommand(addMembersCommand);
membersCommand.addCommand(editRolesCommand);
membersCommand.addCommand(removeMembersCommand);
