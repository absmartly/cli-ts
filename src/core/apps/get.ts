import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ApplicationId } from '../../lib/api/branded-types.js';

export interface GetAppParams {
  id: ApplicationId;
}

export async function getApp(
  client: APIClient,
  params: GetAppParams
): Promise<CommandResult<unknown>> {
  const data = await client.getApplication(params.id);
  return { data };
}
