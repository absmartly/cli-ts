import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { buildPayloadFromOptions } from '../../api-client/payload/build-from-options.js';

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
  params: CreateExperimentFromOptionsParams,
): Promise<Record<string, unknown>> {
  return buildPayloadFromOptions({
    name: params.name,
    displayName: params.displayName,
    type: params.defaultType,
    state: params.state,
    variants: params.variants,
    variantConfig: params.variantConfig,
    percentages: params.percentages,
    percentageOfTraffic: params.percentageOfTraffic,
    unitType: params.unitType,
    applicationId: params.applicationId,
    primaryMetric: params.primaryMetric,
    screenshot: params.screenshot,
    ownerIds: params.ownerIds,
    secondaryMetrics: params.secondaryMetrics,
    guardrailMetrics: params.guardrailMetrics,
    exploratoryMetrics: params.exploratoryMetrics,
    teams: params.teams,
    tags: params.tags,
    audience: params.audience,
    analysisType: params.analysisType,
    requiredAlpha: params.requiredAlpha,
    requiredPower: params.requiredPower,
    baselineParticipants: params.baselineParticipants,
    customFields: params.customFields,
  } as any, client);
}

export async function createExperiment(
  client: APIClient,
  data: Record<string, unknown>,
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
