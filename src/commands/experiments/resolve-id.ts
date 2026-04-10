import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export async function resolveExperimentArg(
  client: APIClient,
  nameOrId: string
): Promise<ExperimentId> {
  return client.resolveExperimentId(nameOrId);
}

export function parseExperimentIdOrName(value: string): string {
  if (!value || !value.trim()) throw new Error('Experiment ID or name is required');
  return value.trim();
}
