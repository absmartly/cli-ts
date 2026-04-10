import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import {
  buildPayloadFromOptions,
  type CreateFromOptionsInput,
} from '../../api-client/payload/build-from-options.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';

export interface CreateExperimentFromOptionsParams {
  name: string;
  displayName?: string;
  defaultType: string;
  state?: string;
  variants?: string;
  variantConfig?: string[];
  percentages?: string;
  percentageOfTraffic?: number;
  unitType?: number;
  applicationId?: number;
  primaryMetric?: number;
  screenshot?: string[];
  ownerIds?: number[];
  secondaryMetrics?: string;
  guardrailMetrics?: string;
  exploratoryMetrics?: string;
  teams?: string;
  tags?: string;
  audience?: string;
  analysisType?: string;
  requiredAlpha?: string;
  requiredPower?: string;
  baselineParticipants?: string;
  minimumDetectableEffect?: number;
  baselinePrimaryMetricMean?: number;
  baselinePrimaryMetricStdev?: number;
  groupSequentialFutilityType?: string;
  groupSequentialAnalysisCount?: number;
  groupSequentialMinAnalysisInterval?: string;
  groupSequentialFirstAnalysisInterval?: string;
  groupSequentialMaxDurationInterval?: string;
  customFields?: Record<string, string>;
}

export interface CreateExperimentResult {
  id: number;
  name: string;
  type: string | undefined;
}

export async function buildCreatePayloadFromOptions(
  client: APIClient,
  params: CreateExperimentFromOptionsParams
): Promise<Record<string, unknown>> {
  const input: CreateFromOptionsInput = {
    name: params.name,
    type: params.defaultType,
    ...(params.displayName !== undefined && { displayName: params.displayName }),
    ...(params.state !== undefined && { state: params.state }),
    ...(params.variants !== undefined && { variants: params.variants }),
    ...(params.variantConfig !== undefined && { variantConfig: params.variantConfig }),
    ...(params.percentages !== undefined && { percentages: params.percentages }),
    ...(params.percentageOfTraffic !== undefined && {
      percentageOfTraffic: params.percentageOfTraffic,
    }),
    ...(params.unitType !== undefined && { unitType: params.unitType }),
    ...(params.applicationId !== undefined && { applicationId: params.applicationId }),
    ...(params.primaryMetric !== undefined && { primaryMetric: params.primaryMetric }),
    ...(params.screenshot !== undefined && { screenshot: params.screenshot }),
    ...(params.ownerIds !== undefined && { ownerIds: params.ownerIds }),
    ...(params.secondaryMetrics !== undefined && { secondaryMetrics: params.secondaryMetrics }),
    ...(params.guardrailMetrics !== undefined && { guardrailMetrics: params.guardrailMetrics }),
    ...(params.exploratoryMetrics !== undefined && {
      exploratoryMetrics: params.exploratoryMetrics,
    }),
    ...(params.teams !== undefined && { teams: params.teams }),
    ...(params.tags !== undefined && { tags: params.tags }),
    ...(params.audience !== undefined && { audience: params.audience }),
    ...(params.analysisType !== undefined && { analysisType: params.analysisType }),
    ...(params.requiredAlpha !== undefined && { requiredAlpha: params.requiredAlpha }),
    ...(params.requiredPower !== undefined && { requiredPower: params.requiredPower }),
    ...(params.baselineParticipants !== undefined && {
      baselineParticipants: params.baselineParticipants,
    }),
    ...(params.minimumDetectableEffect !== undefined && {
      minimumDetectableEffect: String(params.minimumDetectableEffect),
    }),
    ...(params.baselinePrimaryMetricMean !== undefined && {
      baselinePrimaryMetricMean: String(params.baselinePrimaryMetricMean),
    }),
    ...(params.baselinePrimaryMetricStdev !== undefined && {
      baselinePrimaryMetricStdev: String(params.baselinePrimaryMetricStdev),
    }),
    ...(params.groupSequentialFutilityType !== undefined && {
      groupSequentialFutilityType: params.groupSequentialFutilityType,
    }),
    ...(params.groupSequentialAnalysisCount !== undefined && {
      groupSequentialAnalysisCount: String(params.groupSequentialAnalysisCount),
    }),
    ...(params.groupSequentialMinAnalysisInterval !== undefined && {
      groupSequentialMinAnalysisInterval: params.groupSequentialMinAnalysisInterval,
    }),
    ...(params.groupSequentialFirstAnalysisInterval !== undefined && {
      groupSequentialFirstAnalysisInterval: params.groupSequentialFirstAnalysisInterval,
    }),
    ...(params.groupSequentialMaxDurationInterval !== undefined && {
      groupSequentialMaxDurationInterval: params.groupSequentialMaxDurationInterval,
    }),
    ...(params.customFields !== undefined && { customFields: params.customFields }),
  };
  return buildPayloadFromOptions(input, client);
}

export async function createExperiment(
  client: APIClient,
  data: Record<string, unknown>
): Promise<CommandResult<CreateExperimentResult>> {
  const experiment = await client.createExperiment(data);
  return {
    data: {
      id: experiment.id,
      name: experiment.name,
      type: experiment.type,
    },
  };
}

export interface CreateExperimentFromTemplateParams {
  templateContent: string;
  defaultType?: string | undefined;
  name?: string | undefined;
  displayName?: string | undefined;
}

export async function createExperimentFromTemplate(
  client: APIClient,
  params: CreateExperimentFromTemplateParams
): Promise<CommandResult<CreateExperimentResult>> {
  const template = parseExperimentMarkdown(params.templateContent);
  if (params.name) template.name = params.name;
  if (params.displayName) template.display_name = params.displayName;

  const { payload, warnings } = await buildPayloadFromTemplate(
    client,
    template,
    params.defaultType ?? 'test'
  );
  const created = await client.createExperiment(payload);

  return {
    data: {
      id: created.id,
      name: created.name,
      type: created.type,
    },
    warnings,
  };
}
