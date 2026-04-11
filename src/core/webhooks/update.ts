import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { WebhookId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateWebhookParams {
  id: WebhookId;
  name?: string | undefined;
  url?: string | undefined;
  description?: string | undefined;
  enabled?: boolean | undefined;
  ordered?: boolean | undefined;
  maxRetries?: number | undefined;
}

export async function updateWebhook(
  client: APIClient,
  params: UpdateWebhookParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, string | boolean | number> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.url !== undefined) data.url = params.url;
  if (params.description !== undefined) data.description = params.description;
  if (params.enabled !== undefined) data.enabled = params.enabled;
  if (params.ordered !== undefined) data.ordered = params.ordered;
  if (params.maxRetries !== undefined) data.max_retries = params.maxRetries;

  requireAtLeastOneField(data, 'update field');
  await client.updateWebhook(params.id, data);
  return { data: { id: params.id } };
}
