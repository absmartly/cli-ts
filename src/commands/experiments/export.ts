import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { exportExperiment } from '../../core/experiments/export.js';

export const exportCommand = new Command('export')
  .description('Export experiment data')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(
    withErrorHandling(async (id: ExperimentId) => {
      const globalOptions = getGlobalOptions(exportCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await exportExperiment(client, { experimentId: id });
      console.log(chalk.green(`✓ Experiment ${id} data export initiated`));
    })
  );
