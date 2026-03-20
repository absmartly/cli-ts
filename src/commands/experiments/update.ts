import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { parseExperimentId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const updateCommand = new Command('update')
  .description('Update an existing experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--from-file <path>', 'update from markdown template file')
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .option('--traffic <percent>', 'traffic allocation percentage', parseInt)
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let data: Record<string, unknown>;

    if (options.fromFile) {
      const template = parseExperimentFile(options.fromFile);
      data = {};
      if (template.display_name !== undefined) data.display_name = template.display_name;
      if (template.percentage_of_traffic !== undefined) data.percentage_of_traffic = template.percentage_of_traffic;
      if (template.state !== undefined) data.state = template.state;
    } else {
      data = {};
      if (options.displayName !== undefined) data.display_name = options.displayName;
      if (options.traffic !== undefined) data.percentage_of_traffic = options.traffic;
    }

    requireAtLeastOneField(data, 'update field');
    await client.updateExperiment(id, data);
    console.log(chalk.green(`✓ Experiment ${id} updated`));
  }));
