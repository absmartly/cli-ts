import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface PowerMatrixParams {
  config: Record<string, unknown>;
}

export async function getPowerMatrix(
  client: APIClient,
  params: PowerMatrixParams
): Promise<CommandResult<unknown>> {
  const data = await client.getPowerAnalysisMatrix(
    params.config as Parameters<typeof client.getPowerAnalysisMatrix>[0]
  );
  return { data };
}
