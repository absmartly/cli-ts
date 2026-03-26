import { Command } from 'commander';
import Table from 'cli-table3';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, resolveAPIKey, resolveEndpoint, withErrorHandling, type GlobalOptions } from '../../lib/utils/api-helper.js';
import { parseUserId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import { addPaginationOptions, printPaginationFooter } from '../../lib/utils/pagination.js';
import { renderInlineImage, supportsInlineImages } from '../../lib/utils/terminal-image.js';
import type { UserId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeUserRow, summarizeUserDetail } from '../../api-client/entity-summary.js';
import type { User } from '../../api-client/types.js';
import { resetPasswordCommand } from './reset-password.js';
import { userApiKeysCommand } from './api-keys.js';

export const usersCommand = new Command('users').alias('user').description('User commands');

async function displayUserAvatar(user: User, globalOptions: GlobalOptions, width: number): Promise<void> {
  if (!supportsInlineImages() || !user.avatar?.base_url) return;
  const endpoint = resolveEndpoint(globalOptions);
  const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
  const apiKey = await resolveAPIKey(globalOptions);
  const thumbSize = Math.min(width * 16, 128);
  const thumbUrl = `${baseUrl}${user.avatar.base_url}/crop/${thumbSize}x${thumbSize}.webp`;
  try {
    const response = await fetch(thumbUrl, { headers: { Authorization: `Api-Key ${apiKey}` }, redirect: 'follow' });
    if (!response.ok) return;
    const buffer = Buffer.from(await response.arrayBuffer());
    const img = renderInlineImage(buffer, 'avatar.webp', width);
    if (img) process.stdout.write(`\n${img}\n`);
  } catch { /* skip */ }
}

const listCommand = addPaginationOptions(
  new Command('list')
    .description('List all users')
    .option('--include-archived', 'include archived users')
    .option('--show <fields...>', 'include additional fields from API response')
    .option('--exclude <fields...>', 'hide fields from summary')
    .option('--show-avatars [cols]', 'display avatars inline, optional width in columns (default: 3)', parseInt),
).action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const users = await client.listUsers({ includeArchived: options.includeArchived, items: options.items, page: options.page });

    const wantAvatars = options.showAvatars !== undefined && supportsInlineImages() && !globalOptions.raw
      && globalOptions.output !== 'json' && globalOptions.output !== 'yaml';

    if (wantAvatars) {
      const avatarWidth = typeof options.showAvatars === 'number' ? options.showAvatars : 3;
      const endpoint = resolveEndpoint(globalOptions);
      const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
      const apiKey = await resolveAPIKey(globalOptions);
      const headers = { Authorization: `Api-Key ${apiKey}` };

      const avatarMap = new Map<number, string>();
      await Promise.all((users as User[]).map(async (user) => {
        if (!user.avatar?.base_url) return;
        try {
          const thumbUrl = `${baseUrl}${user.avatar.base_url}/crop/48x48.webp`;
          const response = await fetch(thumbUrl, { headers, redirect: 'follow' });
          if (!response.ok) return;
          const buffer = Buffer.from(await response.arrayBuffer());
          const img = renderInlineImage(buffer, 'avatar.webp', avatarWidth, 1);
          if (img) avatarMap.set(user.id, img);
        } catch { /* skip */ }
      }));

      const rows = (users as Array<Record<string, unknown>>).map(u => applyShowExclude(summarizeUserRow(u), u, show, exclude));
      const keys = rows.length > 0 ? Object.keys(rows[0]!) : [];
      const padCol = ' '.repeat(avatarWidth + 1);
      const head = [padCol, ...keys.map(k => chalk.bold.cyan(k))];
      const table = new Table({ head, style: { head: [], border: ['gray'] } });

      for (const row of rows) {
        const cells = keys.map(k => String(row[k] ?? ''));
        table.push([padCol, ...cells]);
      }

      const tableStr = table.toString();
      process.stdout.write(tableStr + '\n');

      const tableLineCount = tableStr.split('\n').length;
      const avatarEntries: Array<{ dataIdx: number; img: string }> = [];
      for (let i = 0; i < rows.length; i++) {
        const img = avatarMap.get(rows[i]!.id as number);
        if (img) avatarEntries.push({ dataIdx: i, img });
      }

      for (const { dataIdx, img } of avatarEntries.reverse()) {
        const tableLine = dataIdx + 3;
        const linesUp = tableLineCount - tableLine;
        process.stdout.write(`\x1b[${linesUp}A\r\x1b[1C${img}`);
        const linesDown = linesUp - 1;
        if (linesDown > 0) process.stdout.write(`\x1b[${linesDown}B`);
        process.stdout.write('\r');
      }
    } else {
      const data = globalOptions.raw ? users : (users as Array<Record<string, unknown>>).map(u => applyShowExclude(summarizeUserRow(u), u, show, exclude));
      printFormatted(data, globalOptions);
    }

    printPaginationFooter(users.length, options.items, options.page, globalOptions.output as string);
  }));

const getCommand = new Command('get')
  .description('Get user details')
  .argument('<id>', 'user ID', parseUserId)
  .option('--show <fields...>', 'include additional fields from API response')
  .option('--exclude <fields...>', 'hide fields from summary')
  .option('--show-avatars [cols]', 'display avatar inline, optional width in columns (default: 15)', parseInt)
  .action(withErrorHandling(async (id: UserId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const show = (options.show as string[] | undefined) ?? [];
    const exclude = (options.exclude as string[] | undefined) ?? [];

    const user = await client.getUser(id);
    const data = globalOptions.raw ? user : applyShowExclude(summarizeUserDetail(user as Record<string, unknown>), user as Record<string, unknown>, show, exclude);
    printFormatted(data, globalOptions);

    if (options.showAvatars !== undefined) {
      const width = typeof options.showAvatars === 'number' ? options.showAvatars : 15;
      await displayUserAvatar(user as User, globalOptions, width);
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
usersCommand.addCommand(userApiKeysCommand);
