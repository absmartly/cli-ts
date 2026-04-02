import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { WebhookId } from '../../lib/api/branded-types.js';

export interface GetWebhookParams {
  id: WebhookId;
}

export async function getWebhook(
  client: APIClient,
  params: GetWebhookParams
): Promise<CommandResult<unknown>> {
  const data = await client.getWebhook(params.id);
  return { data };
}
