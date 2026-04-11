import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { WebhookId } from '../../lib/api/branded-types.js';

export interface DeleteWebhookParams {
  id: WebhookId;
}

export async function deleteWebhook(
  client: APIClient,
  params: DeleteWebhookParams
): Promise<CommandResult<unknown>> {
  await client.deleteWebhook(params.id);
  return { data: { id: params.id } };
}
