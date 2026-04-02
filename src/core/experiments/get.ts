import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { summarizeExperiment } from '../../api-client/experiment-summary.js';

export interface GetExperimentParams {
  experimentId: ExperimentId;
  activity?: boolean | undefined;
  show?: string[] | undefined;
  exclude?: string[] | undefined;
  raw?: boolean | undefined;
}

export interface GetExperimentData {
  experiment: Record<string, unknown>;
  summary: Record<string, unknown>;
  activity?: unknown[] | undefined;
}

export async function getExperiment(
  client: APIClient,
  params: GetExperimentParams,
): Promise<CommandResult<GetExperimentData>> {
  const experiment = await client.getExperiment(params.experimentId);
  const exp = experiment as Record<string, unknown>;

  const extraFields = params.show ?? [];
  const excludeFields = params.exclude ?? [];

  let activityNotes: unknown[] | undefined;
  if (params.activity) {
    activityNotes = await client.listExperimentActivity(params.experimentId);
  }

  let data: unknown;
  if (params.raw) {
    data = params.activity ? { ...experiment, activity: activityNotes } : experiment;
  } else {
    let summary = summarizeExperiment(exp, extraFields, excludeFields);
    if (params.activity) {
      summary = { ...summary, activity: activityNotes };
    }
    data = summary;
  }

  const summary = summarizeExperiment(exp, extraFields, excludeFields);

  return {
    data: {
      experiment: exp,
      summary,
      ...(activityNotes !== undefined && { activity: activityNotes }),
    },
    detail: data as Record<string, unknown>,
  };
}
