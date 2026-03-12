import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const notificationsCommand = new Command('notifications')
  .alias('notification')
  .alias('notif')
  .description('Notifications commands');

const listCommand = new Command('list')
  .description('List notifications')
  .option('--cursor <n>', 'pagination cursor', parseInt)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const notifications = await client.getNotifications(options.cursor);
    printFormatted(notifications, globalOptions);
  }));

const markSeenCommand = new Command('mark-seen')
  .description('Mark all notifications as seen')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(markSeenCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.markNotificationsSeen();
    console.log(chalk.green('✓ All notifications marked as seen'));
  }));

const markReadCommand = new Command('mark-read')
  .description('Mark notifications as read')
  .option('--ids <ids>', 'comma-separated notification IDs (omit to mark all)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(markReadCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const ids = options.ids
      ? options.ids.split(',').map((s: string) => parseInt(s.trim(), 10))
      : undefined;
    await client.markNotificationsRead(ids);
    console.log(chalk.green('✓ Notifications marked as read'));
  }));

const checkCommand = new Command('check')
  .description('Check if there are new notifications')
  .option('--last-id <n>', 'last known notification ID', parseInt)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(checkCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const hasNew = await client.hasNewNotifications(options.lastId);
    if (hasNew) {
      console.log(chalk.yellow('You have new notifications'));
    } else {
      console.log(chalk.green('No new notifications'));
    }
  }));

notificationsCommand.addCommand(listCommand);
notificationsCommand.addCommand(markSeenCommand);
notificationsCommand.addCommand(markReadCommand);
notificationsCommand.addCommand(checkCommand);
