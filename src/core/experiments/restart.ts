import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';
import type { ExperimentInput } from '../../api-client/index.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { resolveCustomFieldValues } from './resolve-custom-fields.js';

export const VALID_RESTART_REASONS = [
  'hypothesis_rejected', 'hypothesis_iteration', 'user_feedback', 'data_issue',
  'implementation_issue', 'experiment_setup_issue', 'guardrail_metric_impact',
  'secondary_metric_impact', 'operational_decision', 'performance_issue',
  'testing', 'tracking_issue', 'code_cleaned_up', 'other',
] as const;

export const VALID_RESTART_TYPES = ['feature', 'experiment'] as const;

export interface RestartExperimentParams {
  experimentId: ExperimentId;
  note?: string;
  reason?: string;
  reshuffle?: boolean;
  state?: string;
  asType?: string;
  fromFile?: string;
  defaultType: string;
  customFieldValues?: Record<string, string>;
}

export interface RestartExperimentResult {
  id: ExperimentId;
  newId: number;
}

export function validateRestartParams(params: RestartExperimentParams): void {
  if (params.reason && !(VALID_RESTART_REASONS as readonly string[]).includes(params.reason)) {
    throw new Error(
      `Invalid reason: "${params.reason}"\n` +
      `Valid reasons: ${VALID_RESTART_REASONS.join(', ')}`
    );
  }
  if (params.state && !['running', 'development'].includes(params.state)) {
    throw new Error(
      `Invalid state: "${params.state}"\n` +
      `Valid states: running, development`
    );
  }
  if (params.asType && !(VALID_RESTART_TYPES as readonly string[]).includes(params.asType)) {
    throw new Error(
      `Invalid type: "${params.asType}"\n` +
      `Valid types: ${VALID_RESTART_TYPES.join(', ')}`
    );
  }
}

export async function buildRestartChanges(
  client: APIClient,
  params: RestartExperimentParams,
): Promise<{ changes: Partial<ExperimentInput> | undefined; warnings: string[] }> {
  let changes: Partial<ExperimentInput> | undefined;
  const warnings: string[] = [];

  if (params.fromFile) {
    const newTemplate = parseExperimentFile(params.fromFile);
    const result = await buildPayloadFromTemplate(client, newTemplate, params.asType || params.defaultType);
    warnings.push(...result.warnings);
    changes = result.payload as Partial<ExperimentInput>;
  }

  if (params.customFieldValues && Object.keys(params.customFieldValues).length > 0) {
    if (!changes) changes = {} as Partial<ExperimentInput>;
    const fieldValues = await resolveCustomFieldValues(client, {
      customFieldValues: params.customFieldValues,
      defaultType: params.defaultType,
    });
    if (Object.keys(fieldValues).length > 0) {
      (changes as Record<string, unknown>).custom_section_field_values = fieldValues;
    }
  }

  return { changes, warnings };
}

export async function restartExperiment(
  client: APIClient,
  params: RestartExperimentParams,
  changes?: Partial<ExperimentInput>,
): Promise<CommandResult<RestartExperimentResult>> {
  validateRestartParams(params);

  const restartOptions: Record<string, unknown> = { note: params.note ?? 'Restarted via CLI' };
  if (params.reason) restartOptions.reason = params.reason;
  if (params.reshuffle) restartOptions.reshuffle = true;
  if (params.state) restartOptions.state = params.state;
  if (params.asType) restartOptions.restart_as_type = params.asType;
  if (changes) restartOptions.changes = changes;

  const newExperiment = await client.restartExperiment(params.experimentId, restartOptions as Parameters<typeof client.restartExperiment>[1]);
  return {
    data: {
      id: params.experimentId,
      newId: newExperiment.id,
    },
  };
}
