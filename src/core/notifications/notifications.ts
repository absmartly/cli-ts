import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListNotificationsParams {
  cursor?: number | undefined;
}

export async function listNotifications(
  client: APIClient,
  params: ListNotificationsParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getNotifications(params.cursor);
  return { data };
}

export async function markNotificationsSeen(
  client: APIClient,
): Promise<CommandResult<void>> {
  await client.markNotificationsSeen();
  return { data: undefined };
}

export interface MarkNotificationsReadParams {
  ids?: number[] | undefined;
}

export async function markNotificationsRead(
  client: APIClient,
  params: MarkNotificationsReadParams,
): Promise<CommandResult<void>> {
  await client.markNotificationsRead(params.ids);
  return { data: undefined };
}

export interface CheckNotificationsParams {
  lastId?: number | undefined;
}

export async function checkNotifications(
  client: APIClient,
  params: CheckNotificationsParams,
): Promise<CommandResult<{ hasNew: boolean }>> {
  const hasNew = await client.hasNewNotifications(params.lastId);
  return { data: { hasNew } };
}
