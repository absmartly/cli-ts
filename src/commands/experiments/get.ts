import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling, resolveEndpoint, resolveAPIKey } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { summarizeExperiment } from '../../api-client/experiment-summary.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--activity', 'include activity notes in the output')
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields in summary (e.g. --show audience archived)')
  .option('--embed-screenshots', 'embed screenshots as base64 data URIs in template output')
  .option('--screenshots-dir <path>', 'save screenshots to directory in template output')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);

    if (globalOptions.output === 'template') {
      const needsAuth = options.embedScreenshots || options.screenshotsDir;
      const md = await experimentToMarkdown(experiment, {
        embedScreenshots: options.embedScreenshots,
        screenshotsDir: options.screenshotsDir,
        apiEndpoint: resolveEndpoint(globalOptions),
        ...(needsAuth && { apiKey: await resolveAPIKey(globalOptions) }),
      });
      console.log(md);
      return;
    }

    const useRaw = options.raw || globalOptions.output === 'json' || globalOptions.output === 'yaml';
    const extraFields = (options.show as string[] | undefined) ?? [];

    if (options.activity) {
      const notes = await client.listExperimentActivity(id);
      const data = useRaw ? { ...experiment, activity: notes } : summarizeExperiment(experiment as Record<string, unknown>, extraFields);
      printFormatted(data, globalOptions);
    } else {
      const data = useRaw ? experiment : summarizeExperiment(experiment as Record<string, unknown>, extraFields);
      printFormatted(data, globalOptions);
    }
  }));
