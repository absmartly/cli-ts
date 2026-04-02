import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';
import { summarizeExperiment } from '../../api-client/experiment-summary.js';
import { diffExperiments } from '../../api-client/experiment-diff.js';

export interface DiffExperimentsParams {
  experimentId1: ExperimentId;
  experimentId2?: ExperimentId | undefined;
  iteration?: number | undefined;
  raw?: boolean | undefined;
}

export interface DiffEntry {
  field: string;
  left: string;
  right: string;
}

export async function diffExperimentsCore(
  client: APIClient,
  params: DiffExperimentsParams,
): Promise<CommandResult<DiffEntry[]>> {
  const exp1 = await client.getExperiment(params.experimentId1);

  let exp2: Record<string, unknown>;
  if (params.iteration !== undefined) {
    const iterations = await client.listExperiments({ iterations_of: params.experimentId1 as number });
    const target = iterations.find(
      (it: Record<string, unknown>) => it.iteration === params.iteration,
    );
    if (!target) {
      const available = iterations.map((it: Record<string, unknown>) => it.iteration);
      throw new Error(
        `Iteration ${params.iteration} not found for experiment ${params.experimentId1}. Available: ${available.join(', ')}`,
      );
    }
    exp2 = target as Record<string, unknown>;
  } else if (params.experimentId2 !== undefined) {
    exp2 = await client.getExperiment(params.experimentId2) as Record<string, unknown>;
  } else {
    throw new Error('Provide a second experiment ID or use --iteration <n>');
  }

  const left = params.raw
    ? exp1 as Record<string, unknown>
    : summarizeExperiment(exp1 as Record<string, unknown>);
  const right = params.raw
    ? exp2
    : summarizeExperiment(exp2);

  const diffs = diffExperiments(left, right);

  const rows = diffs.map(d => ({
    field: d.field,
    left: typeof d.left === 'object' ? JSON.stringify(d.left) : String(d.left ?? ''),
    right: typeof d.right === 'object' ? JSON.stringify(d.right) : String(d.right ?? ''),
  }));

  return {
    data: rows,
    rows,
  };
}
