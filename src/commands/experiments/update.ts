import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import type { Experiment } from '../../lib/api/types.js';

export const updateCommand = new Command('update')
  .description('Update an existing experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .option('--from-file <path>', 'update from markdown template file')
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .option('--traffic <percent>', 'traffic allocation percentage', parseInt)
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      let data: Partial<Experiment>;

      if (options.fromFile) {
        const template = parseExperimentFile(options.fromFile);
        data = {};

        if (template.display_name) data.display_name = template.display_name;
        if (template.description) data.description = template.description;
        if (template.percentage_of_traffic) data.traffic = template.percentage_of_traffic;
        if (template.state) data.state = template.state;
      } else {
        data = {};
        if (options.displayName) data.display_name = options.displayName;
        if (options.description) data.description = options.description;
        if (options.traffic) data.traffic = options.traffic;
      }

      await client.updateExperiment(id, data);

      console.log(chalk.green(`✓ Experiment ${id} updated`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
