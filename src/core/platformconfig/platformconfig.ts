import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function listPlatformConfigs(client: APIClient): Promise<CommandResult<unknown>> {
  const data = await client.listPlatformConfigs();
  return { data };
}

export interface GetPlatformConfigParams {
  id: number;
}

export async function getPlatformConfig(
  client: APIClient,
  params: GetPlatformConfigParams
): Promise<CommandResult<unknown>> {
  const data = await client.getPlatformConfig(params.id);
  return { data };
}

export interface UpdatePlatformConfigParams {
  id: number;
  value: unknown;
}

export async function updatePlatformConfig(
  client: APIClient,
  params: UpdatePlatformConfigParams
): Promise<CommandResult<unknown>> {
  let current: unknown;
  try {
    current = await client.getPlatformConfig(params.id);
  } catch (err) {
    throw new Error(`Cannot update platform config ${params.id}: failed to fetch existing config`, {
      cause: err,
    });
  }
  if (!current || typeof current !== 'object') {
    const got = current === null ? 'null' : typeof current;
    throw new Error(
      `Cannot update platform config ${params.id}: GET returned malformed payload (expected object, got ${got})`
    );
  }
  // Last-writer-wins on every field except `value`: we read the current config and PUT it back
  // with the new value. Concurrent writes to other fields between this GET and PUT are silently
  // overwritten with the stale read. id is in the URL path; don't echo it in the body.
  const { id: _id, ...rest } = current as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...rest, value: params.value };
  const data = await client.updatePlatformConfig(params.id, merged);
  return { data };
}
