import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { saveCachedFields } from '../../lib/config/custom-fields-cache.js';
import { loadConfig } from '../../lib/config/config.js';

export const refreshFieldsCommand = new Command('refresh-fields')
  .description('Refresh cached custom fields for CLI option discovery')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(refreshFieldsCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = loadConfig();
    const profile = (globalOptions.profile as string) ?? config['default-profile'] ?? 'default';

    const fields = await client.listCustomSectionFields();

    for (const type of ['test', 'feature']) {
      saveCachedFields(profile, type, fields);
    }

    const relevant = fields.filter(f => !f.archived && !f.custom_section?.archived);
    console.log(chalk.green(`✓ Cached ${relevant.length} custom fields for profile "${profile}"`));

    for (const field of relevant) {
      const title = (field as { title?: string }).title ?? field.name ?? '';
      const section = (field.custom_section as { type?: string })?.type ?? '';
      console.log(`  ${title} (${field.type}, ${section})`);
    }

    console.log('');
    console.log(chalk.gray('Custom fields will now appear in --help for create and update commands.'));
  }));
