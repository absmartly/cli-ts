import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';
import type { ExperimentInput } from '../../api-client/index.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { buildSecondaryMetrics } from '../../api-client/payload/metrics-builder.js';
import { parseCSV } from '../../api-client/payload/parse-csv.js';
import { parseScreenshotEntries } from '../../api-client/payload/screenshot-parser.js';
import { resolveCustomFieldValues } from './resolve-custom-fields.js';

export interface UpdateExperimentParams {
  experimentId: ExperimentId;
  name?: string;
  displayName?: string;
  state?: string;
  percentageOfTraffic?: number;
  percentages?: string;
  analysisType?: string;
  requiredAlpha?: string;
  requiredPower?: string;
  baselineParticipants?: string;
  audience?: string;
  primaryMetric?: number;
  unitType?: number;
  applicationId?: number;
  owner?: string[];
  variants?: string;
  variantConfig?: string[];
  secondaryMetrics?: string;
  guardrailMetrics?: string;
  exploratoryMetrics?: string;
  teams?: string;
  tags?: string;
  screenshot?: string[];
  screenshotId?: string[];
  customFieldValues?: Record<string, string>;
  templateContent?: string | undefined;
  defaultType: string;
  note?: string;
}

export async function buildUpdateChanges(
  client: APIClient,
  params: UpdateExperimentParams
): Promise<{ changes: Partial<ExperimentInput> & Record<string, unknown>; warnings: string[] }> {
  const changes: Partial<ExperimentInput> & Record<string, unknown> = {};
  const warnings: string[] = [];

  if (params.name !== undefined) changes.name = params.name;
  if (params.displayName !== undefined) changes.display_name = params.displayName;
  if (params.state !== undefined) changes.state = params.state;
  if (params.percentageOfTraffic !== undefined)
    changes.percentage_of_traffic = params.percentageOfTraffic;
  if (params.percentages)
    changes.percentages = params.percentages
      .split(',')
      .map((p: string) => parseInt(p.trim(), 10))
      .join('/');
  if (params.analysisType) changes.analysis_type = params.analysisType;
  if (params.requiredAlpha) changes.required_alpha = params.requiredAlpha;
  if (params.requiredPower) changes.required_power = params.requiredPower;
  if (params.baselineParticipants)
    changes.baseline_participants_per_day = params.baselineParticipants;
  if (params.audience) changes.audience = params.audience;

  if (params.primaryMetric) changes.primary_metric = { metric_id: params.primaryMetric };
  if (params.unitType) changes.unit_type = { unit_type_id: params.unitType };
  if (params.applicationId)
    changes.applications = [{ application_id: params.applicationId, application_version: '0' }];

  if (params.owner?.length)
    changes.owners = params.owner.map((uid: string) => ({ user_id: parseInt(uid, 10) }));

  if (params.variants) {
    const names = params.variants.split(',').map((n: string) => n.trim());
    const configs: string[] = params.variantConfig || [];
    changes.variants = names.map((name: string, i: number) => ({
      name,
      variant: i,
      config: configs[i] || '{}',
    }));
    changes.nr_variants = names.length;
  }

  if (params.secondaryMetrics || params.guardrailMetrics || params.exploratoryMetrics) {
    const allNames = [
      ...parseCSV(params.secondaryMetrics),
      ...parseCSV(params.guardrailMetrics),
      ...parseCSV(params.exploratoryMetrics),
    ];
    const resolved = await client.resolveMetrics(allNames);
    const byName = new Map(allNames.map((name, i) => [name, resolved[i]!]));

    changes.secondary_metrics = buildSecondaryMetrics({
      secondary: parseCSV(params.secondaryMetrics).map((n) => byName.get(n)!),
      guardrail: parseCSV(params.guardrailMetrics).map((n) => byName.get(n)!),
      exploratory: parseCSV(params.exploratoryMetrics).map((n) => byName.get(n)!),
    });
  }

  if (params.teams) {
    const resolved = await client.resolveTeams(parseCSV(params.teams));
    changes.teams = resolved.map((t) => ({ team_id: t.id }));
  }

  if (params.tags) {
    const resolved = await client.resolveTags(parseCSV(params.tags));
    changes.experiment_tags = resolved.map((t) => ({ experiment_tag_id: t.id }));
  }

  if (params.screenshot?.length || params.screenshotId?.length) {
    const screenshotEntries: Array<Record<string, unknown>> = [];

    if (params.screenshotId?.length) {
      for (const entry of params.screenshotId) {
        const colonIdx = entry.indexOf(':');
        if (colonIdx === -1)
          throw new Error(
            `Invalid --screenshot-id format: "${entry}". Expected: <variant_index>:<upload_id>`
          );
        const variantIdx = parseInt(entry.substring(0, colonIdx), 10);
        const uploadId = parseInt(entry.substring(colonIdx + 1), 10);
        if (isNaN(variantIdx) || isNaN(uploadId))
          throw new Error(`Invalid variant index or upload ID in --screenshot-id: "${entry}"`);
        screenshotEntries.push({ variant: variantIdx, screenshot_file_upload_id: uploadId });
      }
    }

    if (params.screenshot?.length) {
      const parsed = await parseScreenshotEntries(params.screenshot);
      screenshotEntries.push(...parsed);
    }

    changes.variant_screenshots = screenshotEntries as ExperimentInput['variant_screenshots'];
  }

  if (params.customFieldValues && Object.keys(params.customFieldValues).length > 0) {
    const fieldValues = await resolveCustomFieldValues(client, {
      customFieldValues: params.customFieldValues,
      defaultType: params.defaultType,
    });
    if (Object.keys(fieldValues).length > 0) {
      changes.custom_section_field_values =
        fieldValues as ExperimentInput['custom_section_field_values'];
    }
  }

  if (params.templateContent) {
    const template = parseExperimentMarkdown(params.templateContent);
    const resolved = await buildPayloadFromTemplate(client, template, params.defaultType);
    warnings.push(...resolved.warnings);
    for (const [key, value] of Object.entries(resolved.payload)) {
      changes[key] = value;
    }
  }

  return { changes, warnings };
}

export interface UpdateExperimentActionParams {
  experimentId: ExperimentId;
  changes: Partial<ExperimentInput> & Record<string, unknown>;
  note?: string | undefined;
}

export async function updateExperiment(
  client: APIClient,
  params: UpdateExperimentActionParams
): Promise<CommandResult<{ id: ExperimentId }>> {
  const options = params.note !== undefined ? { note: params.note } : undefined;
  await client.updateExperiment(params.experimentId, params.changes, options);
  return {
    data: { id: params.experimentId },
  };
}
