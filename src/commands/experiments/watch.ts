import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { extractMetricInfos, extractVariantNames, fetchAllMetricResults, formatResultRows } from '../../api-client/metric-results.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { startPolling } from '../../lib/utils/polling.js';

export const watchCommand = new Command('watch')
  .description('Watch live metric results for a running experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--interval <seconds>', 'poll interval in seconds', '60')
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(watchCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);
    const intervalSeconds = parseInt(options.interval, 10);

    if (isNaN(intervalSeconds) || intervalSeconds < 1) {
      throw new Error('Interval must be a positive integer');
    }

    let previousJson = '';
    let isFirstTick = true;

    const fetchAndDisplay = async () => {
      const experiment = await client.getExperiment(id);
      const exp = experiment as Record<string, unknown>;
      const metricInfos = extractMetricInfos(exp);
      const variantNames = extractVariantNames(exp);

      if (metricInfos.length === 0) {
        console.log(chalk.blue('No metrics assigned to this experiment.'));
        return;
      }

      const results = await fetchAllMetricResults(client, id, metricInfos);
      const currentJson = JSON.stringify(results);
      const timestamp = new Date().toLocaleTimeString();

      if (isFirstTick || currentJson !== previousJson) {
        console.clear();
        const displayName = (exp.display_name || exp.name) as string;
        const state = exp.state as string;
        console.log(chalk.bold(`Watching experiment ${id} — ${displayName} (${state})`));
        console.log(chalk.gray(`Last updated: ${timestamp}`));
        console.log(chalk.gray(`Polling every ${intervalSeconds}s... Press Ctrl+C to stop\n`));

        const useRaw = globalOptions.output === 'json' || globalOptions.output === 'yaml';
        if (useRaw) {
          printFormatted(results, globalOptions);
        } else {
          const rows = results.flatMap(r => formatResultRows(r, variantNames));
          printFormatted(rows, globalOptions);
        }

        previousJson = currentJson;
        isFirstTick = false;
      } else {
        process.stdout.write(chalk.gray('.'));
      }
    };

    await fetchAndDisplay();

    startPolling({
      intervalMs: intervalSeconds * 1000,
      onTick: fetchAndDisplay,
    });
  }));
