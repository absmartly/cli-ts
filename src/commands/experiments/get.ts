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
      lines.push(`| Field | Value |`);
      lines.push(`|---|---|`);
      const tableFields = [
        'id', 'name', 'type', 'state', 'application', 'unit_type',
        'percentage_of_traffic', 'percentages', 'primary_metric',
        'secondary_metrics', 'guardrail_metrics', 'exploratory_metrics',
        'owners', 'teams', 'tags',
      ];
      for (const key of tableFields) {
        const val = summary[key];
        if (val !== undefined && val !== '' && String(val).replace(/,\s*/g, '').trim()) {
          lines.push(`| **${key}** | ${val} |`);
        }
      }
      for (const key of Object.keys(summary)) {
        const val = String(summary[key] ?? '');
        if (val.startsWith('n=') && key.startsWith('result')) {
          lines.push(`| **${key}** | ${val} |`);
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
          const config = String(v.config ?? '{}');
          if (config && config !== '{}') {
            try { lines.push(`\`\`\`json\n${JSON.stringify(JSON.parse(config), null, 2)}\n\`\`\``); }
            catch { lines.push(`\`\`\`json\n${config}\n\`\`\``); }
          }
          const ss = screenshots?.find(s => s.variant === v.variant);
          if (ss) {
            const fileUpload = ss.file_upload as Record<string, unknown> | undefined;
            if (fileUpload?.base_url) {
              const endpoint = resolveEndpoint(globalOptions);
              const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
              lines.push(`\x00IMG|${baseUrl}${fileUpload.base_url}/${fileUpload.file_name}|${fileUpload.file_name || 'screenshot'}\x00`);
            }
          }
          lines.push('');
        }
      }

      const customFields = exp.custom_section_field_values as Array<Record<string, unknown>> | undefined;
      if (customFields?.length) {
        const users = await client.listUsers({ items: 500 });
        const userMap = new Map<number, { name: string; email: string }>();
        for (const u of users) {
          userMap.set(u.id, {
            name: [u.first_name, u.last_name].filter(Boolean).join(' '),
            email: u.email,
          });
        }
        const endpoint = resolveEndpoint(globalOptions);
        const dashboardUrl = endpoint.replace(/\/v\d+\/?$/, '');

        let currentSection = '';
        for (const cfv of customFields) {
          const field = cfv.custom_section_field as Record<string, unknown> | undefined;
          const section = (field?.custom_section as Record<string, unknown>)?.title as string ?? '';
          const title = (field?.title as string) ?? '';
          let value = (cfv.value as string) ?? '';
          const fieldType = (field?.type as string) ?? (cfv.type as string) ?? '';
          if (!title) continue;

          if (fieldType === 'user' && value) {
            const formatUser = (userId: number) => {
              const u = userMap.get(userId);
              if (!u) return `user:${userId}`;
              return `[${u.name} <${u.email}>](${dashboardUrl}/users/${userId})`;
            };
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'number') {
                value = formatUser(parsed);
              } else if (parsed?.selected) {
                const selected = (parsed.selected as Array<{ userId: number }>) ?? [];
                if (selected.length === 0) continue;
                value = selected.map(s => formatUser(s.userId)).join(', ');
              } else {
                continue;
              }
            } catch {
              const asInt = parseInt(value, 10);
              if (!isNaN(asInt)) value = formatUser(asInt);
            }
          }

          if (section && section !== currentSection) {
            lines.push(`## ${section}`);
            currentSection = section;
          }
          lines.push(`### ${title}`);
          if (value.trim()) lines.push(value);
          lines.push('');
        }
      }

      const fmtDate = (v: unknown) => {
        if (!v) return 'N/A';
        const d = new Date(String(v));
        return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
      };
      lines.push(`---`);
      lines.push(`*Created: ${fmtDate(summary.created_at)} | Updated: ${fmtDate(summary.updated_at)} | Started: ${fmtDate(summary.start_at)} | Stopped: ${fmtDate(summary.stop_at)}*`);

      const md = lines.join('\n');
      const showImages = options.showImages !== undefined && supportsInlineImages();

      if (showImages) {
        const imgEntries: Array<{ url: string; name: string }> = [];
        const withPlaceholders = md.replace(/\x00IMG\|([^|]+)\|([^\x00]+)\x00/g, (_, url, name) => {
          imgEntries.push({ url, name });
          return `\x00IMGREF:${imgEntries.length - 1}\x00`;
        });
        const rendered = formatNoteText(withPlaceholders);
        const parts = rendered.split(/\x00IMGREF:(\d+)\x00/);

        const endpointUrl = new URL(resolveEndpoint(globalOptions));
        const apiKey = await resolveAPIKey(globalOptions);
        const width = typeof options.showImages === 'number' ? options.showImages : 40;

        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            process.stdout.write(parts[i]!);
          } else {
            const img = imgEntries[parseInt(parts[i]!, 10)]!;
            const imgUrl = new URL(img.url, endpointUrl.origin);
            const headers = imgUrl.origin === endpointUrl.origin
              ? { Authorization: `Api-Key ${apiKey}` }
              : undefined;
            process.stdout.write('\n');
            await fetchAndDisplayImage(imgUrl.toString(), img.name, { ...(headers && { headers }), width });
          }
        }
        if (!rendered.endsWith('\n')) process.stdout.write('\n');
      } else {
        const cleaned = md.replace(/\x00IMG\|[^|]+\|([^\x00]+)\x00/g, '[$1]');
        console.log(formatNoteText(cleaned));
      }
      return;
    }

    const extraFields = (options.show as string[] | undefined) ?? [];
    const excludeFields = (options.exclude as string[] | undefined) ?? [];

    let data: unknown;
    if (globalOptions.raw) {
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
