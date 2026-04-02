import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateUserParams {
  email: string;
  name: string;
  role?: string | undefined;
}

export async function createUser(
  client: APIClient,
  params: CreateUserParams,
): Promise<CommandResult<{ id: number }>> {
  const parts = params.name.split(' ');
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  const data = await client.createUser({
    email: params.email,
    first_name: firstName,
    last_name: lastName,
  } as any);
  return { data: data as { id: number } };
}
