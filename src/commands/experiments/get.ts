import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
  resolveEndpoint,
  resolveAPIKey,
} from '../../lib/utils/api-helper.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { summarizeExperiment } from '../../api-client/experiment-summary.js';
import { fetchAndDisplayImage, supportsInlineImages } from '../../lib/utils/terminal-image.js';
import { formatNoteText } from '../activity/index.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { stripApiVersionPath } from '../../lib/utils/url.js';
import { getExperiment } from '../../core/experiments/get.js';
import { formatDate } from '../../api-client/format-helpers.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--activity', 'include activity notes in the output')
  .option(
    '--show <fields...>',
    'include additional fields in summary (e.g. --show audience archived)'
  )
  .option('--exclude <fields...>', 'hide fields from summary (e.g. --exclude owners tags)')
  .option(
    '--show-only <fields...>',
    'show only these fields (mutually exclusive with --show and --exclude)'
  )
  .option('--embed-screenshots', 'embed screenshots as base64 data URIs in template output')
  .option('--screenshots-dir <path>', 'save screenshots to directory in template output')
  .option(
    '--show-images [cols]',
    'display screenshots inline, optional width in columns (default: 40)',
    parseInt
  )
  .action(
    withErrorHandling(async (nameOrId: string, options) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

      const showOnly = options.showOnly as string[] | undefined;
      if (showOnly && (options.show || options.exclude)) {
        throw new Error('--show-only is mutually exclusive with --show and --exclude');
      }

      // Template output mode - stays in wrapper (complex formatting)
      if (globalOptions.output === 'template') {
        const experiment = await client.getExperiment(id);
        const md = await experimentToMarkdown(experiment, {
          embedScreenshots: options.embedScreenshots,
          screenshotsDir: options.screenshotsDir,
          apiEndpoint: resolveEndpoint(globalOptions),
          ...((options.embedScreenshots || options.screenshotsDir) && {
            apiKey: await resolveAPIKey(globalOptions),
          }),
        });
        console.log(md);
        return;
      }

      // Rendered output mode - stays in wrapper (complex formatting)
      if (globalOptions.output === 'rendered') {
        const experiment = await client.getExperiment(id);
        const exp = experiment as Record<string, unknown>;

        const userShow = (options.show as string[] | undefined) ?? [];
        const userExclude = (options.exclude as string[] | undefined) ?? [];

        const customFieldEntries =
          (exp.custom_section_field_values as Array<Record<string, unknown>> | undefined) ?? [];
        const customFieldTitles = customFieldEntries
          .map((cfv) => {
            const field = cfv.custom_section_field as Record<string, unknown> | undefined;
            return (field?.title as string | undefined) ?? '';
          })
          .filter((t): t is string => t.length > 0);

        const implicitExtras = showOnly ? [] : ['audience', ...customFieldTitles];
        const effectiveShow = [...implicitExtras, ...userShow];

        const summary = summarizeExperiment(exp, effectiveShow, userExclude, showOnly);
        const lines: string[] = [];

        const titleVal =
          summary.display_name !== undefined && summary.display_name !== ''
            ? summary.display_name
            : (summary.name ?? exp.display_name ?? exp.name ?? '');
        if (titleVal !== '') {
          lines.push(`# ${titleVal}`);
          lines.push('');
        }
        lines.push(`| Field | Value |`);
        lines.push(`|---|---|`);
        const headerOrder = [
          'id',
          'name',
          'type',
          'state',
          'application',
          'unit_type',
          'percentage_of_traffic',
          'percentages',
          'primary_metric',
          'owners',
          'teams',
          'tags',
        ];
        const sectionedKeys = new Set([
          'display_name',
          'audience',
          'variants',
          'secondary_metrics',
          'guardrail_metrics',
          'exploratory_metrics',
          'created_at',
          'updated_at',
          'start_at',
          'stop_at',
          ...customFieldTitles,
        ]);
        const metricSectionKeys = ['secondary_metrics', 'guardrail_metrics', 'exploratory_metrics'];

        const summaryKeys = Object.keys(summary);
        const headerKeysInOrder = [
          ...headerOrder.filter((k) => k in summary),
          ...summaryKeys.filter(
            (k) => !headerOrder.includes(k) && !sectionedKeys.has(k) && !k.startsWith('result')
          ),
        ];
        for (const key of headerKeysInOrder) {
          const val = summary[key];
          if (val === undefined || val === '') continue;
          if (typeof val === 'string' && !val.replace(/,\s*/g, '').trim()) continue;
          lines.push(`| **${key}** | ${typeof val === 'object' ? JSON.stringify(val) : val} |`);
        }
        for (const key of summaryKeys) {
          if (!key.startsWith('result')) continue;
          const val = String(summary[key] ?? '');
          if (val.startsWith('n=')) {
            lines.push(`| **${key}** | ${val} |`);
          }
        }
        lines.push('');

        for (const key of metricSectionKeys) {
          if (!(key in summary)) continue;
          const val = String(summary[key] ?? '');
          if (!val) continue;
          const label = key.replace(/_/g, ' ');
          lines.push(`## ${label.charAt(0).toUpperCase() + label.slice(1)}`);
          for (const metric of val.split(', ')) lines.push(`- ${metric}`);
          lines.push('');
        }

        if ('audience' in summary && summary.audience !== '' && summary.audience !== null) {
          lines.push('## Audience');
          lines.push('```json');
          if (typeof summary.audience === 'object') {
            lines.push(JSON.stringify(summary.audience, null, 2));
          } else {
            try {
              lines.push(JSON.stringify(JSON.parse(String(summary.audience)), null, 2));
            } catch {
              lines.push(String(summary.audience));
            }
          }
          lines.push('```');
          lines.push('');
        }

        const variants = exp.variants as Array<Record<string, unknown>> | undefined;
        const screenshots = exp.variant_screenshots as Array<Record<string, unknown>> | undefined;
        if ('variants' in summary && variants?.length) {
          lines.push('## Variants');
          lines.push('');
          for (const v of variants) {
            lines.push(`### ${v.name || `Variant ${v.variant}`}`);
            const config = String(v.config ?? '{}');
            if (config && config !== '{}') {
              try {
                lines.push(`\`\`\`json\n${JSON.stringify(JSON.parse(config), null, 2)}\n\`\`\``);
              } catch {
                lines.push(`\`\`\`json\n${config}\n\`\`\``);
              }
            }
            const ss = screenshots?.find((s) => s.variant === v.variant);
            if (ss) {
              const fileUpload = ss.file_upload as Record<string, unknown> | undefined;
              if (fileUpload?.base_url) {
                const endpoint = resolveEndpoint(globalOptions);
                const baseUrl = stripApiVersionPath(endpoint);
                lines.push(
                  `\x00IMG|${baseUrl}${fileUpload.base_url}/${fileUpload.file_name}|${fileUpload.file_name || 'screenshot'}\x00`
                );
              }
            }
            lines.push('');
          }
        }

        const renderableCustomFields = customFieldEntries.filter((cfv) => {
          const field = cfv.custom_section_field as Record<string, unknown> | undefined;
          const title = (field?.title as string) ?? '';
          return title.length > 0 && title in summary;
        });
        if (renderableCustomFields.length > 0) {
          const users = await client.listUsers({ items: 500 });
          const userMap = new Map<number, { name: string; email: string }>();
          for (const u of users) {
            userMap.set(u.id, {
              name: [u.first_name, u.last_name].filter(Boolean).join(' '),
              email: u.email,
            });
          }
          const endpoint = resolveEndpoint(globalOptions);
          const dashboardUrl = stripApiVersionPath(endpoint);

          let currentSection = '';
          for (const cfv of renderableCustomFields) {
            const field = cfv.custom_section_field as Record<string, unknown> | undefined;
            const title = (field?.title as string) ?? '';
            const section =
              ((field?.custom_section as Record<string, unknown>)?.title as string) ?? '';
            let value = (cfv.value as string) ?? '';
            const fieldType = (field?.type as string) ?? (cfv.type as string) ?? '';

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
                  value = selected.map((s) => formatUser(s.userId)).join(', ');
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

        const renderDate = (key: 'created_at' | 'updated_at' | 'start_at' | 'stop_at') => {
          const fromSummary = summary[key];
          if (typeof fromSummary === 'string' && fromSummary) return fromSummary;
          const fallback = formatDate(exp[key]);
          return fallback || 'N/A';
        };

        lines.push(`---`);
        lines.push(
          `*Created: ${renderDate('created_at')} | Updated: ${renderDate('updated_at')} | Started: ${renderDate('start_at')} | Stopped: ${renderDate('stop_at')}*`
        );

        const md = lines.join('\n');
        const showImages = options.showImages !== undefined && supportsInlineImages();

        if (showImages) {
          const imgEntries: Array<{ url: string; name: string }> = [];
          const withPlaceholders = md.replace(
            /\x00IMG\|([^|]+)\|([^\x00]+)\x00/g,
            (_, url, name) => {
              imgEntries.push({ url, name });
              return `\x00IMGREF:${imgEntries.length - 1}\x00`;
            }
          );
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
              const headers =
                imgUrl.origin === endpointUrl.origin
                  ? { Authorization: `Api-Key ${apiKey}` }
                  : undefined;
              process.stdout.write('\n');
              await fetchAndDisplayImage(imgUrl.toString(), img.name, {
                ...(headers && { headers }),
                width,
              });
            }
          }
          if (!rendered.endsWith('\n')) process.stdout.write('\n');
        } else {
          const cleaned = md.replace(/\x00IMG\|[^|]+\|([^\x00]+)\x00/g, '[$1]');
          console.log(formatNoteText(cleaned));
        }
        return;
      }

      // Standard output modes - use core function
      const result = await getExperiment(client, {
        experimentId: id,
        activity: options.activity,
        show: options.show,
        exclude: options.exclude,
        showOnly,
        raw: globalOptions.raw,
      });

      printFormatted(result.detail, globalOptions);

      if (options.showImages && supportsInlineImages()) {
        const screenshots = result.data.experiment.variant_screenshots as
          | Array<Record<string, unknown>>
          | undefined;
        if (screenshots?.length) {
          const endpoint = resolveEndpoint(globalOptions);
          const baseUrl = stripApiVersionPath(endpoint);
          const apiKey = await resolveAPIKey(globalOptions);
          const headers = { Authorization: `Api-Key ${apiKey}` };
          const variants = result.data.experiment.variants as
            | Array<Record<string, unknown>>
            | undefined;

          for (const screenshot of screenshots) {
            const fileUpload = screenshot.file_upload as Record<string, unknown> | undefined;
            if (!fileUpload?.base_url) continue;
            const variantIdx = screenshot.variant as number;
            const variantName =
              (variants?.find((v) => v.variant === variantIdx)?.name as string) ??
              `variant ${variantIdx}`;
            const fileName = (fileUpload.file_name as string) ?? 'screenshot';
            const url = `${baseUrl}${fileUpload.base_url}/${fileName}`;

            console.log(`\n${variantName}:`);
            const width = typeof options.showImages === 'number' ? options.showImages : 40;
            await fetchAndDisplayImage(url, fileName, { headers, width });
          }
        }
      }
    })
  );
