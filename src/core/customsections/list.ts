import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function listCustomSections(
  client: APIClient
): Promise<CommandResult<unknown>> {
  const data = await client.listCustomSections();
  return { data };
}
