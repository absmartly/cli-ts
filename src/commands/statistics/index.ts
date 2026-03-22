import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { validateJSON } from '../../lib/utils/validators.js';

export const statisticsCommand = new Command('statistics')
  .aliases(['stats', 'stat'])
  .description('Statistical analysis commands');

const powerMatrixCommand = new Command('power-matrix')
  .description('Calculate power analysis matrix (sample sizes or MDEs)')
  .requiredOption('--config <json>', 'power analysis configuration as JSON')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(powerMatrixCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const result = await client.getPowerAnalysisMatrix(config as Parameters<typeof client.getPowerAnalysisMatrix>[0]);
    printFormatted(result, globalOptions);
  }));

statisticsCommand.addCommand(powerMatrixCommand);
