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

    if (globalOptions.output === 'template') {
      const md = await experimentToMarkdown(experiment, {
        embedScreenshots: options.embedScreenshots,
        screenshotsDir: options.screenshotsDir,
        apiEndpoint: resolveEndpoint(globalOptions),
        ...((options.embedScreenshots || options.screenshotsDir) && { apiKey: await resolveAPIKey(globalOptions) }),
      });
      console.log(md);
      return;
    }

    if (globalOptions.output === 'rendered') {
      const exp = experiment as Record<string, unknown>;
      const summary = summarizeExperiment(exp, ['audience']);
      const lines: string[] = [];

      lines.push(`# ${summary.display_name || summary.name}`);
      lines.push('');
      lines.push(`| | |`);
      lines.push(`|---|---|`);
      for (const key of ['id', 'name', 'type', 'state', 'application', 'unit_type', 'percentage_of_traffic', 'percentages', 'primary_metric']) {
        if (summary[key] !== undefined && summary[key] !== '') lines.push(`| **${key}** | ${summary[key]} |`);
      }
      lines.push('');

      if (summary.secondary_metrics) lines.push(`**Secondary metrics:** ${summary.secondary_metrics}`);
      if (summary.guardrail_metrics) lines.push(`**Guardrail metrics:** ${summary.guardrail_metrics}`);
      if (summary.exploratory_metrics) lines.push(`**Exploratory metrics:** ${summary.exploratory_metrics}`);
      lines.push('');

      if (summary.owners) lines.push(`**Owners:** ${summary.owners}`);
      if (summary.teams && String(summary.teams).replace(/,\s*/g, '').trim()) lines.push(`**Teams:** ${summary.teams}`);
      if (summary.tags && String(summary.tags).replace(/,\s*/g, '').trim()) lines.push(`**Tags:** ${summary.tags}`);
      lines.push('');

      for (const key of Object.keys(summary)) {
        const val = String(summary[key] ?? '');
        if (val.startsWith('n=') && key.startsWith('result')) {
          lines.push(`**${key}:** ${val}`);
        }
      }
      lines.push('');

      if (summary.audience && String(summary.audience) !== '') {
        lines.push('## Audience');
        lines.push('```json');
        try { lines.push(JSON.stringify(JSON.parse(String(summary.audience)), null, 2)); } catch { lines.push(String(summary.audience)); }
        lines.push('```');
        lines.push('');
      }

      const variants = exp.variants as Array<Record<string, unknown>> | undefined;
      const screenshots = exp.variant_screenshots as Array<Record<string, unknown>> | undefined;
      if (variants?.length) {
        lines.push('## Variants');
        lines.push('');
        for (const v of variants) {
          lines.push(`### ${v.name || `Variant ${v.variant}`}`);
          if (v.config && v.config !== '{}') lines.push(`\`\`\`json\n${v.config}\n\`\`\``);
          const ss = screenshots?.find(s => s.variant === v.variant);
          if (ss) {
            const fileUpload = ss.file_upload as Record<string, unknown> | undefined;
            if (fileUpload?.base_url) {
              const endpoint = resolveEndpoint(globalOptions);
              const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
              lines.push(`![${fileUpload.file_name || 'screenshot'}](${baseUrl}${fileUpload.base_url}/${fileUpload.file_name})`);
            }
          }
          lines.push('');
        }
      }

      const customFields = exp.custom_section_field_values as Array<Record<string, unknown>> | undefined;
      if (customFields?.length) {
        let currentSection = '';
        for (const cfv of customFields) {
          const field = cfv.custom_section_field as Record<string, unknown> | undefined;
          const section = (field?.custom_section as Record<string, unknown>)?.title as string ?? '';
          const title = (field?.title as string) ?? '';
          const value = (cfv.value as string) ?? '';
          if (!title) continue;
          if (section && section !== currentSection) {
            lines.push(`## ${section}`);
            currentSection = section;
          }
          lines.push(`### ${title}`);
          if (value.trim()) lines.push(value);
          lines.push('');
        }
      }

      lines.push(`---`);
      lines.push(`*Created: ${summary.created_at} | Updated: ${summary.updated_at} | Started: ${summary.start_at || 'N/A'} | Stopped: ${summary.stop_at || 'N/A'}*`);

      const rendered = formatNoteText(lines.join('\n'));

      console.log(rendered);

      if (options.showImages && supportsInlineImages()) {
        if (screenshots?.length && variants?.length) {
          const endpoint = resolveEndpoint(globalOptions);
          const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
          const apiKey = await resolveAPIKey(globalOptions);
          const headers = { Authorization: `Api-Key ${apiKey}` };
          const width = typeof options.showImages === 'number' ? options.showImages : 40;
          for (const ss of screenshots) {
            const fileUpload = ss.file_upload as Record<string, unknown> | undefined;
            if (!fileUpload?.base_url) continue;
            const variantName = variants.find(v => v.variant === ss.variant)?.name as string ?? `variant ${ss.variant}`;
            const fileName = fileUpload.file_name as string ?? 'screenshot';
            console.log(`\n${variantName}:`);
            await fetchAndDisplayImage(`${baseUrl}${fileUpload.base_url}/${fileName}`, fileName, { headers, width });
          }
        }
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
