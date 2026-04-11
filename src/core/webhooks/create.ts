import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateWebhookParams {
  name: string;
  url: string;
  description?: string | undefined;
  enabled?: boolean | undefined;
  ordered?: boolean | undefined;
  maxRetries?: number | undefined;
}

export async function createWebhook(
  client: APIClient,
  params: CreateWebhookParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = {
    name: params.name,
    url: params.url,
  };
  if (params.description !== undefined) payload.description = params.description;
  if (params.enabled !== undefined) payload.enabled = params.enabled;
  if (params.ordered !== undefined) payload.ordered = params.ordered;
  if (params.maxRetries !== undefined) payload.max_retries = params.maxRetries;
  const data = await client.createWebhook(payload);
  return { data };
}
