import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const webhooksCommand = new Command('webhooks')
  .alias('webhook')
  .description('Webhook commands');

const listCommand = new Command('list')
  .description('List all webhooks')
  .option('--limit <number>', 'maximum number of results', parseInt, 20)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const webhooks = await client.listWebhooks(options.limit, options.offset);

      const output = formatOutput(webhooks, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const getCommand = new Command('get')
  .description('Get webhook details')
  .argument('<id>', 'webhook ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const webhook = await client.getWebhook(id);

      const output = formatOutput(webhook, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const createCommand = new Command('create')
  .description('Create a new webhook')
  .requiredOption('--name <name>', 'webhook name')
  .requiredOption('--url <url>', 'webhook URL')
  .option('--description <text>', 'webhook description')
  .option('--enabled', 'enable the webhook', true)
  .option('--no-enabled', 'disable the webhook')
  .option('--ordered', 'send events in order', false)
  .option('--max-retries <number>', 'maximum number of retries', parseInt, 3)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data = {
        name: options.name,
        url: options.url,
        description: options.description,
        enabled: options.enabled,
        ordered: options.ordered,
        max_retries: options.maxRetries,
      };

      const webhook = await client.createWebhook(data);

      console.log(chalk.green(`✓ Webhook created with ID: ${webhook.id}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const updateCommand = new Command('update')
  .description('Update a webhook')
  .argument('<id>', 'webhook ID', parseInt)
  .option('--name <name>', 'new name')
  .option('--url <url>', 'new URL')
  .option('--description <text>', 'new description')
  .option('--enabled <boolean>', 'enable/disable the webhook', (val) => val === 'true')
  .option('--ordered <boolean>', 'send events in order', (val) => val === 'true')
  .option('--max-retries <number>', 'maximum number of retries', parseInt)
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: Record<string, string | boolean | number> = {};
      if (options.name) data.name = options.name;
      if (options.url) data.url = options.url;
      if (options.description) data.description = options.description;
      if (options.enabled !== undefined) data.enabled = options.enabled;
      if (options.ordered !== undefined) data.ordered = options.ordered;
      if (options.maxRetries !== undefined) data.max_retries = options.maxRetries;

      await client.updateWebhook(id, data);

      console.log(chalk.green(`✓ Webhook ${id} updated`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const deleteCommand = new Command('delete')
  .description('Delete a webhook')
  .argument('<id>', 'webhook ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteWebhook(id);

      console.log(chalk.green(`✓ Webhook ${id} deleted`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

webhooksCommand.addCommand(listCommand);
webhooksCommand.addCommand(getCommand);
webhooksCommand.addCommand(createCommand);
webhooksCommand.addCommand(updateCommand);
webhooksCommand.addCommand(deleteCommand);
