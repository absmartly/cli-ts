import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, resolveAPIKey, resolveEndpoint, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseUserId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { addPaginationOptions, printPaginationFooter } from '../../lib/utils/pagination.js';
import { fetchAndDisplayImage, supportsInlineImages } from '../../lib/utils/terminal-image.js';
import type { UserId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeUserRow, summarizeUserDetail } from '../../api-client/entity-summary.js';
import type { User } from '../../api-client/types.js';
import { resetPasswordCommand } from './reset-password.js';

export const usersCommand = new Command('users').alias('user').description('User commands');

async function displayUserAvatars(users: User[], globalOptions: Record<string, unknown>, width: number): Promise<void> {
  if (!supportsInlineImages()) return;
  const endpoint = resolveEndpoint(globalOptions);
  const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
  const apiKey = await resolveAPIKey(globalOptions);
  const headers = { Authorization: `Api-Key ${apiKey}` };

  for (const user of users) {
    if (!user.avatar?.base_url) continue;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
    const url = `${baseUrl}${user.avatar.base_url}/${user.avatar.file_name}`;
    console.log(`\n${name}:`);
    await fetchAndDisplayImage(url, user.avatar.file_name ?? 'avatar', { headers, width });
  }
}

const listCommand = addPaginationOptions(
  new Command('list')
    .description('List all users')
    .option('--include-archived', 'include archived users')
    .option('--raw', 'show full API response without summarizing')
    .option('--show <fields...>', 'include additional fields from API response')
    .option('--exclude <fields...>', 'hide fields from summary')
    .option('--show-avatars [cols]', 'display avatars inline, optional width in columns (default: 10)', parseInt),
).action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const users = await client.listUsers({ includeArchived: options.includeArchived, items: options.items, page: options.page });
    const data = options.raw ? users : (users as Array<Record<string, unknown>>).map(u => applyShowExclude(summarizeUserRow(u), u, show, exclude));
    printFormatted(data, globalOptions);
    printPaginationFooter(users.length, options.items, options.page);

    if (options.showAvatars !== undefined) {
      const width = typeof options.showAvatars === 'number' ? options.showAvatars : 10;
      await displayUserAvatars(users as User[], globalOptions, width);
    }
  }));

const getCommand = new Command('get')
  .description('Get user details')
  .argument('<id>', 'user ID', parseUserId)
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .option('--show-avatars [cols]', 'display avatar inline, optional width in columns (default: 15)', parseInt)
  .action(withErrorHandling(async (id: UserId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const user = await client.getUser(id);
    const data = options.raw ? user : applyShowExclude(summarizeUserDetail(user as Record<string, unknown>), user as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);

    if (options.showAvatars !== undefined) {
      const width = typeof options.showAvatars === 'number' ? options.showAvatars : 15;
      await displayUserAvatars([user as User], globalOptions, width);
    }
  }));

const createCommand = new Command('create')
  .description('Create a new user')
  .requiredOption('--email <email>', 'user email')
  .requiredOption('--name <name>', 'user full name')
  .option('--role <role>', 'user role')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const [firstName, ...lastNameParts] = options.name.split(' ');
    const user = await client.createUser({
      email: options.email,
      first_name: firstName,
      last_name: lastNameParts.join(' '),
    });

    console.log(chalk.green(`✓ User created with ID: ${user.id}`));
  }));

const updateCommand = new Command('update')
  .description('Update a user')
  .argument('<id>', 'user ID', parseUserId)
  .option('--name <name>', 'new full name')
  .option('--role <role>', 'new role')
  .action(withErrorHandling(async (id: UserId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const data: Record<string, string> = {};
    if (options.name) {
      const [firstName, ...lastNameParts] = options.name.split(' ');
      data.first_name = firstName;
      data.last_name = lastNameParts.join(' ');
    }

    requireAtLeastOneField(data, 'update field');
    await client.updateUser(id, data);
    console.log(chalk.green(`✓ User ${id} updated`));
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a user')
  .argument('<id>', 'user ID', parseUserId)
  .option('--unarchive', 'unarchive the user')
  .action(withErrorHandling(async (id: UserId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.archiveUser(id, options.unarchive);

    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ User ${id} ${action}`));
  }));

usersCommand.addCommand(listCommand);
usersCommand.addCommand(getCommand);
usersCommand.addCommand(createCommand);
usersCommand.addCommand(updateCommand);
usersCommand.addCommand(archiveCommand);
usersCommand.addCommand(resetPasswordCommand);
