import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function listStorageConfigs(
  client: APIClient,
): Promise<CommandResult<unknown>> {
  const data = await client.listStorageConfigs();
  return { data };
}

export interface GetStorageConfigParams {
  id: number;
}

export async function getStorageConfig(
  client: APIClient,
  params: GetStorageConfigParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getStorageConfig(params.id);
  return { data };
}

export interface CreateStorageConfigParams {
  config: Record<string, unknown>;
}

export async function createStorageConfig(
  client: APIClient,
  params: CreateStorageConfigParams,
): Promise<CommandResult<unknown>> {
  const data = await client.createStorageConfig(params.config);
  return { data };
}

export interface UpdateStorageConfigParams {
  id: number;
  config: Record<string, unknown>;
}

export async function updateStorageConfig(
  client: APIClient,
  params: UpdateStorageConfigParams,
): Promise<CommandResult<unknown>> {
  const data = await client.updateStorageConfig(params.id, params.config);
  return { data };
}

export interface TestStorageConfigParams {
  config: Record<string, unknown>;
}

export async function testStorageConfig(
  client: APIClient,
  params: TestStorageConfigParams,
): Promise<CommandResult<unknown>> {
  await client.testStorageConfig(params.config);
  return { data: { success: true } };
}
