import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling, resolveEndpoint, resolveAPIKey } from '../../lib/utils/api-helper.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { summarizeExperiment } from '../../api-client/experiment-summary.js';
import { fetchAndDisplayImage, supportsInlineImages } from '../../lib/utils/terminal-image.js';
import { formatNoteText } from '../activity/index.js';
import { parseExperimentIdOrName } from './resolve-id.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--activity', 'include activity notes in the output')
  .option('--raw', 'show full API response without summarizing')
  .option('--show <fields...>', 'include additional fields in summary (e.g. --show audience archived)')
  .option('--exclude <fields...>', 'hide fields from summary (e.g. --exclude owners tags)')
  .option('--embed-screenshots', 'embed screenshots as base64 data URIs in template output')
  .option('--screenshots-dir <path>', 'save screenshots to directory in template output')
  .option('--show-images [cols]', 'display screenshots inline, optional width in columns (default: 40)', parseInt)
  .action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);

    const experiment = await client.getExperiment(id);

    if (globalOptions.output === 'template' || globalOptions.output === 'rendered') {
      const md = await experimentToMarkdown(experiment, {
        embedScreenshots: options.embedScreenshots,
        screenshotsDir: options.screenshotsDir,
        apiEndpoint: resolveEndpoint(globalOptions),
        ...((options.embedScreenshots || options.screenshotsDir) && { apiKey: await resolveAPIKey(globalOptions) }),
      });
      if (globalOptions.output === 'rendered') {
        console.log(formatNoteText(md));
      } else {
        console.log(md);
      }
      return;
    }

    const extraFields = (options.show as string[] | undefined) ?? [];
    const excludeFields = (options.exclude as string[] | undefined) ?? [];

    let data: unknown;
    if (options.raw) {
      data = options.activity ? { ...experiment, activity: await client.listExperimentActivity(id) } : experiment;
    } else {
      let summary = summarizeExperiment(experiment as Record<string, unknown>, extraFields, excludeFields);
      if (options.activity) {
        const notes = await client.listExperimentActivity(id);
        summary = { ...summary, activity: notes };
      }
      data = summary;
    }
    printFormatted(data, globalOptions);

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
