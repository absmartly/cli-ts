import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface TestStorageConfigParams {
  config: Record<string, unknown>;
}

export async function testStorageConfig(
  client: APIClient,
  params: TestStorageConfigParams
): Promise<CommandResult<unknown>> {
  await client.testStorageConfig(params.config);
  return { data: { success: true } };
}
