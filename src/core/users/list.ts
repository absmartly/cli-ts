import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListUsersParams {
  items?: number | undefined;
  page?: number | undefined;
  includeArchived?: boolean | undefined;
}

export async function listUsers(
  client: APIClient,
  params: ListUsersParams
): Promise<CommandResult<unknown[]>> {
  const opts: { includeArchived?: boolean; items?: number; page?: number } = {};
  if (params.includeArchived !== undefined) opts.includeArchived = params.includeArchived;
  if (params.items !== undefined) opts.items = params.items;
  if (params.page !== undefined) opts.page = params.page;
  const data = await client.listUsers(opts);
  return {
    data,
    pagination: {
      page: params.page ?? 1,
      items: params.items ?? 25,
      hasMore: data.length >= (params.items ?? 25),
    },
  };
}
