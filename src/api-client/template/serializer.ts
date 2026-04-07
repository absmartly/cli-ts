import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Experiment, Variant } from '../types.js';
import { stripApiVersionPath } from '../../lib/utils/url.js';

export interface SerializerOptions {
  embedScreenshots?: boolean;
  screenshotsDir?: string;
  apiEndpoint?: string;
  apiKey?: string;
}

async function fetchScreenshotBuffer(url: string, apiKey?: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Api-Key ${apiKey}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(`Warning: Screenshot fetch failed (${response.status}): ${url}`);
      return null;
    }
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType };
  } catch (error) {
    console.error(`Warning: Screenshot fetch error: ${error instanceof Error ? error.message : url}`);
    return null;
  }
}

function escapeYamlScalar(value: unknown): string {
  const str = String(value);
  if (/[:"'\n\r\\#\[\]{}&*!|>%`]/.test(str) || str.trim() !== str || str === '') {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
  }
  return str;
}

export async function experimentToMarkdown(experiment: Experiment, options: SerializerOptions = {}): Promise<string> {
  const exp = experiment as Record<string, unknown>;
  const parts: string[] = [];

  parts.push('---\n');
  parts.push(`name: ${escapeYamlScalar(experiment.name)}\n`);
  if (experiment.display_name) {
    parts.push(`display_name: ${escapeYamlScalar(experiment.display_name)}\n`);
  }
  parts.push(`type: ${exp.type || 'test'}\n`);
  if (exp.state) parts.push(`state: ${exp.state}\n`);
  if (exp.percentage_of_traffic !== undefined) parts.push(`percentage_of_traffic: ${exp.percentage_of_traffic}\n`);
  if (exp.percentages) parts.push(`percentages: ${exp.percentages}\n`);

  const unitType = experiment.unit_type as Record<string, unknown> | undefined;
  if (unitType) parts.push(`unit_type: ${unitType.name ?? unitType.unit_type_id ?? unitType.id}\n`);

  const applications = experiment.applications as Array<Record<string, unknown>> | undefined;
  if (applications && applications.length > 0) {
    const appNames = applications.map(a => {
      const nested = a.application as Record<string, unknown> | undefined;
      return nested?.name ?? a.name ?? a.application_id;
    });
    parts.push(`application: ${appNames.join(', ')}\n`);
  }

  const primaryMetric = experiment.primary_metric as Record<string, unknown> | undefined;
  if (primaryMetric) {
    parts.push(`primary_metric: ${escapeYamlScalar(primaryMetric.name || primaryMetric.metric_id || primaryMetric.id)}\n`);
  }

  const allMetrics = experiment.secondary_metrics as Array<Record<string, unknown>> | undefined;
  if (allMetrics && allMetrics.length > 0) {
    const secondaryGroup: Array<Record<string, unknown>> = [];
    const guardrailGroup: Array<Record<string, unknown>> = [];
    const exploratoryGroup: Array<Record<string, unknown>> = [];
    for (const m of allMetrics) {
      const type = m.type as string;
      if (type === 'guardrail') guardrailGroup.push(m);
      else if (type === 'exploratory') exploratoryGroup.push(m);
      else secondaryGroup.push(m);
    }
    const groups: Array<[string, Array<Record<string, unknown>>]> = [
      ['secondary_metrics', secondaryGroup],
      ['guardrail_metrics', guardrailGroup],
      ['exploratory_metrics', exploratoryGroup],
    ];
    for (const [key, metrics] of groups) {
      if (metrics.length === 0) continue;
      parts.push(`${key}:\n`);
      for (const m of metrics) {
        const metric = m.metric as Record<string, unknown> | undefined;
      parts.push(`  - ${escapeYamlScalar(metric?.name || m.name || m.metric_id)}\n`);
      }
    }
  }

  const owners = exp.owners as Array<Record<string, unknown>> | undefined;
  if (owners && owners.length > 0) {
    parts.push(`owners:\n`);
    for (const o of owners) {
      const user = o.user as Record<string, unknown> | undefined;
      if (user?.first_name && user?.email) {
        parts.push(`  - ${escapeYamlScalar(`${user.first_name} ${user.last_name ?? ''} <${user.email}>`.trim())}\n`);
      } else {
        parts.push(`  - ${escapeYamlScalar(user?.email ?? o.user_id)}\n`);
      }
    }
  }

  const teams = exp.teams as Array<Record<string, unknown>> | undefined;
  if (teams && teams.length > 0) {
    const teamNames = teams.map(t => {
      const nested = t.team as Record<string, unknown> | undefined;
      return nested?.name ?? t.name;
    }).filter(Boolean);
    if (teamNames.length > 0) {
      parts.push(`teams:\n`);
      for (const name of teamNames) parts.push(`  - ${escapeYamlScalar(name)}\n`);
    }
  }

  const tags = exp.experiment_tags as Array<Record<string, unknown>> | undefined;
  if (tags && tags.length > 0) {
    const tagNames = tags.map(t => {
      const nested = t.experiment_tag as Record<string, unknown> | undefined;
      return (nested?.tag as string) ?? (t.tag as Record<string, unknown>)?.name ?? t.tag;
    }).filter(Boolean);
    if (tagNames.length > 0) {
      parts.push(`tags:\n`);
      for (const name of tagNames) parts.push(`  - ${escapeYamlScalar(name)}\n`);
    }
  }

  if (exp.analysis_type) parts.push(`analysis_type: ${exp.analysis_type}\n`);
  if (exp.required_alpha) parts.push(`required_alpha: ${exp.required_alpha}\n`);
  if (exp.required_power) parts.push(`required_power: ${exp.required_power}\n`);
  if (exp.baseline_participants_per_day) parts.push(`baseline_participants: ${exp.baseline_participants_per_day}\n`);

  parts.push('---\n');

  if (exp.audience) {
    let audienceObj: unknown;
    try {
      audienceObj = typeof exp.audience === 'string' ? JSON.parse(exp.audience as string) : exp.audience;
    } catch {
      audienceObj = exp.audience;
    }
    parts.push('\n## Audience\n\n');
    parts.push('```json\n');
    parts.push(JSON.stringify(audienceObj, null, 2));
    parts.push('\n```\n');
  }

  const variants = experiment.variants as Variant[] | undefined;
  const variantScreenshots = exp.variant_screenshots as Array<Record<string, unknown>> | undefined;
  if (variants && variants.length > 0) {
    parts.push('\n## Variants\n');
    for (const v of variants) {
      const idx = v.variant ?? variants.indexOf(v);
      parts.push(`\n### variant_${idx}\n\n`);
      parts.push(`name: ${v.name || ''}\n`);
      if (v.config) {
        const configStr = typeof v.config === 'object' ? JSON.stringify(v.config) : v.config;
        parts.push(`config: ${configStr}\n`);
      }

      const screenshot = variantScreenshots?.find(s => s.variant === idx);
      if (screenshot) {
        const uploadId = screenshot.screenshot_file_upload_id as number | undefined;
        const label = (screenshot.label as string) || '';
        const fileUpload = screenshot.file_upload as Record<string, unknown> | undefined;
        if (fileUpload) {
          const fileName = fileUpload.file_name as string;
          const relativePath = `${fileUpload.base_url}/${fileName}`;
          const needsFetch = (options.embedScreenshots || options.screenshotsDir) && options.apiEndpoint;

          if (needsFetch) {
            const baseUrl = stripApiVersionPath(options.apiEndpoint!);
            const result = await fetchScreenshotBuffer(`${baseUrl}${relativePath}`, options.apiKey);

            if (result && options.screenshotsDir) {
              mkdirSync(options.screenshotsDir, { recursive: true });
              const localPath = join(options.screenshotsDir, fileName);
              writeFileSync(localPath, result.buffer);
              parts.push(`![${label}](${localPath})\n`);
            } else if (result && options.embedScreenshots) {
              const dataUri = `data:${result.contentType};base64,${result.buffer.toString('base64')}`;
              parts.push(`![${label}](${dataUri})\n`);
            } else {
              parts.push(`![${label}](${relativePath})\n`);
            }
          } else {
            parts.push(`![${label}](${relativePath})\n`);
          }
          if (uploadId) parts.push(`screenshot_id: ${uploadId}\n`);
        }
      }
    }
  }

  const userLookup = new Map<number, string>();
  const allOwners = exp.owners as Array<Record<string, unknown>> | undefined;
  if (allOwners) {
    for (const o of allOwners) {
      const user = o.user as Record<string, unknown> | undefined;
      const userId = (o.user_id ?? user?.user_id ?? user?.id) as number | undefined;
      const email = user?.email as string | undefined;
      if (userId && email) userLookup.set(userId, email);
    }
  }
  const createdBy = exp.created_by as Record<string, unknown> | undefined;
  if (createdBy?.email) {
    const cbId = (createdBy.user_id ?? createdBy.id) as number | undefined;
    if (cbId) userLookup.set(cbId, createdBy.email as string);
  }
  const updatedBy = exp.updated_by as Record<string, unknown> | undefined;
  if (updatedBy?.email) {
    const ubId = (updatedBy.user_id ?? updatedBy.id) as number | undefined;
    if (ubId) userLookup.set(ubId, updatedBy.email as string);
  }

  const customFieldValues = exp.custom_section_field_values as Array<Record<string, unknown>> | undefined;
  if (customFieldValues && customFieldValues.length > 0) {
    const nonEmpty = customFieldValues.filter(entry => {
      const field = entry.custom_section_field as Record<string, unknown> | undefined;
      return field?.title;
    }).sort((a, b) => {
      const fa = a.custom_section_field as Record<string, unknown>;
      const fb = b.custom_section_field as Record<string, unknown>;
      const sa = fa.custom_section as Record<string, unknown> | undefined;
      const sb = fb.custom_section as Record<string, unknown> | undefined;
      const sectionDiff = ((sa?.order_index as number) ?? 0) - ((sb?.order_index as number) ?? 0);
      if (sectionDiff !== 0) return sectionDiff;
      return ((fa.order_index as number) ?? 0) - ((fb.order_index as number) ?? 0);
    });
    if (nonEmpty.length > 0) {
      let currentSection = '';
      for (const entry of nonEmpty) {
        const field = entry.custom_section_field as Record<string, unknown>;
        const section = field.custom_section as Record<string, unknown> | undefined;
        const sectionTitle = (section?.title as string) || 'Custom Fields';
        const title = field.title as string;
        let value = entry.value == null ? '' : String(entry.value);
        const fieldType = (entry.type ?? field.type) as string | undefined;

        if (fieldType === 'user' && value) {
          try {
            const parsed = JSON.parse(value);
            const userIds = (parsed.selected as Array<{ userId: number }>)?.map(s => s.userId) ?? [];
            const resolved = userIds.map(id => userLookup.get(id) ?? `user:${id}`);
            value = resolved.join(', ');
          } catch {
            console.error(`Warning: Custom field "${title}" has non-JSON user value, keeping raw value`);
          }
        }

        if (sectionTitle !== currentSection) {
          currentSection = sectionTitle;
          parts.push(`\n## ${sectionTitle}\n`);
        }

        parts.push(`\n### ${title}\n\n`);
        parts.push(`${value}\n`);
      }
    }
  }

  return parts.join('');
}
