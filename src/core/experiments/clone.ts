import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { Experiment } from '../../lib/api/types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { readFileSync } from 'fs';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { mergeTemplateOverrides } from '../../api-client/template/merge-overrides.js';

export interface CloneExperimentParams {
  experimentId: ExperimentId;
  name?: string;
  displayName?: string;
  state?: string;
  fromFile?: string;
  defaultType: string;
  apiEndpoint: string;
  apiKey?: string | undefined;
}

export interface CloneExperimentResult {
  sourceId: ExperimentId;
  id: number;
  name: string;
  type: string | undefined;
}

export async function buildClonePayload(
  client: APIClient,
  params: CloneExperimentParams,
): Promise<{ payload: Partial<Experiment>; warnings: string[] }> {
  const experiment = await client.getExperiment(params.experimentId);
  const hasScreenshots = ((experiment.variant_screenshots as unknown[] | undefined)?.length ?? 0) > 0;
  const md = await experimentToMarkdown(experiment, {
    apiEndpoint: params.apiEndpoint,
    ...(hasScreenshots && params.apiKey ? {
      apiKey: params.apiKey,
      screenshotsDir: '.screenshots',
    } : {}),
  });

  let template = parseExperimentMarkdown(md);

  if (params.fromFile) {
    const overrideTemplate = parseExperimentMarkdown(
      readFileSync(params.fromFile === '-' ? '/dev/stdin' : params.fromFile, 'utf8')
    );
    template = mergeTemplateOverrides(template, overrideTemplate);
  }

  if (params.name) template.name = params.name;
  if (params.displayName) template.display_name = params.displayName;
  template.state = params.state ?? 'created';

  const result = await buildPayloadFromTemplate(client, template, params.defaultType);
  return { payload: result.payload as Partial<Experiment>, warnings: result.warnings };
}

export async function cloneExperiment(
  client: APIClient,
  payload: Record<string, unknown>,
  sourceId: ExperimentId,
): Promise<CommandResult<CloneExperimentResult>> {
  const created = await client.createExperiment(payload);
  return {
    data: {
      sourceId,
      id: created.id,
      name: created.name,
      type: created.type,
    },
  };
}
