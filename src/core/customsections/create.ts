import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateCustomSectionParams {
  name: string;
  type: string;
}

export async function createCustomSection(
  client: APIClient,
  params: CreateCustomSectionParams
): Promise<CommandResult<unknown>> {
  const data = await client.createCustomSection({ name: params.name, type: params.type });
  return { data };
}
