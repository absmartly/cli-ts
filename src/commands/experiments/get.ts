import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling, resolveEndpoint, resolveAPIKey } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { summarizeExperiment } from '../../api-client/experiment-summary.js';
import { fetchAndDisplayImage, supportsInlineImages } from '../../lib/utils/terminal-image.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--activity', 'include activity notes in the output')
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields in summary (e.g. --show audience archived)')
  .option('--embed-screenshots', 'embed screenshots as base64 data URIs in template output')
  .option('--screenshots-dir <path>', 'save screenshots to directory in template output')
  .option('--show-images [cols]', 'display screenshots inline, optional width in columns (default: 40)', parseInt)
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

    if (options.showImages && supportsInlineImages()) {
      const screenshots = (experiment as Record<string, unknown>).variant_screenshots as Array<Record<string, unknown>> | undefined;
      if (screenshots?.length) {
        const endpoint = resolveEndpoint(globalOptions);
        const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
        const apiKey = await resolveAPIKey(globalOptions);
        const headers = { Authorization: `Api-Key ${apiKey}` };
        const variants = (experiment as Record<string, unknown>).variants as Array<Record<string, unknown>> | undefined;

        for (const screenshot of screenshots) {
          const fileUpload = screenshot.file_upload as Record<string, unknown> | undefined;
          if (!fileUpload?.base_url) continue;
          const variantIdx = screenshot.variant as number;
          const variantName = variants?.find(v => v.variant === variantIdx)?.name as string ?? `variant ${variantIdx}`;
          const fileName = fileUpload.file_name as string ?? 'screenshot';
          const url = `${baseUrl}${fileUpload.base_url}/${fileName}`;

          console.log(`\n${variantName}:`);
          const width = typeof options.showImages === 'number' ? options.showImages : 40;
          await fetchAndDisplayImage(url, fileName, { headers, width });
        }
      }
    }
  }));
