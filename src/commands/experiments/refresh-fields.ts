import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { saveCachedFields } from '../../lib/config/custom-fields-cache.js';
import { saveCachedActionDialogFields, type ActionDialogField } from '../../lib/config/action-dialog-cache.js';
import { loadConfig } from '../../lib/config/config.js';

export const refreshFieldsCommand = new Command('refresh-fields')
  .description('Refresh cached custom fields and action dialog configuration')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(refreshFieldsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = loadConfig();
    const profile = globalOptions.profile ?? config['default-profile'] ?? 'default';

    const [fields, actionFields] = await Promise.all([
      client.listCustomSectionFields(),
      client.listExperimentActionDialogFields() as Promise<ActionDialogField[]>,
    ]);

    for (const type of ['test', 'feature']) {
      saveCachedFields(profile, type, fields);
    }

    saveCachedActionDialogFields(profile, actionFields);

    const relevant = fields.filter(f => !f.archived && !f.custom_section?.archived);
    console.log(chalk.green(`✓ Cached ${relevant.length} custom fields for profile "${profile}"`));

    for (const field of relevant) {
      const title = (field as { title?: string }).title ?? field.name ?? '';
      const section = (field.custom_section as { type?: string })?.type ?? '';
      console.log(`  ${title} (${field.type}, ${section})`);
    }

    const requiredActions = actionFields.filter(f => f.required);
    if (requiredActions.length > 0) {
      console.log('');
      console.log(chalk.green(`✓ Cached ${actionFields.length} action dialog fields`));
      console.log(`  ${requiredActions.length} action(s) require notes: ${requiredActions.map(f => `${f.action_type}/${f.type}`).join(', ')}`);
    } else {
      console.log('');
      console.log(chalk.green(`✓ Cached ${actionFields.length} action dialog fields`));
    }

    console.log('');
    console.log(chalk.gray('Custom fields will now appear in --help for create and update commands.'));
    console.log(chalk.gray('Action dialog config (required notes, defaults) will be used by action commands.'));
  }));
