import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { loadConfig } from '../../lib/config/config.js';
import { refreshFields } from '../../core/experiments/refresh-fields.js';

export const refreshFieldsCommand = new Command('refresh-fields')
  .description('Refresh cached custom fields and action dialog configuration')
  .action(
    withErrorHandling(async () => {
      const globalOptions = getGlobalOptions(refreshFieldsCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = loadConfig();
      const profile = globalOptions.profile ?? config['default-profile'] ?? 'default';

      const result = await refreshFields(client, { profile });

      console.log(
        chalk.green(
          `✓ Cached ${result.data.relevantFields.length} custom fields for profile "${profile}"`
        )
      );

      for (const field of result.data.relevantFields) {
        console.log(`  ${field.title} (${field.type}, ${field.sectionType})`);
      }

      const requiredActions = result.data.requiredActionFields;
      if (requiredActions.length > 0) {
        console.log('');
        console.log(
          chalk.green(`✓ Cached ${result.data.actionFields.length} action dialog fields`)
        );
        console.log(
          `  ${requiredActions.length} action(s) require notes: ${requiredActions.map((f) => `${f.action_type}/${f.type}`).join(', ')}`
        );
      } else {
        console.log('');
        console.log(
          chalk.green(`✓ Cached ${result.data.actionFields.length} action dialog fields`)
        );
      }

      console.log('');
      console.log(
        chalk.gray('Custom fields will now appear in --help for create and update commands.')
      );
      console.log(
        chalk.gray(
          'Action dialog config (required notes, defaults) will be used by action commands.'
        )
      );
    })
  );
