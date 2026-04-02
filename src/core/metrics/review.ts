import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface GetMetricReviewParams {
  id: MetricId;
}

export async function getMetricReview(
  client: APIClient,
  params: GetMetricReviewParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getMetricReview(params.id);
  return { data };
}

export interface RequestMetricReviewParams {
  id: MetricId;
}

export async function requestMetricReview(
  client: APIClient,
  params: RequestMetricReviewParams,
): Promise<CommandResult<void>> {
  await client.requestMetricReview(params.id);
  return { data: undefined };
}

export interface ApproveMetricReviewParams {
  id: MetricId;
}

export async function approveMetricReview(
  client: APIClient,
  params: ApproveMetricReviewParams,
): Promise<CommandResult<void>> {
  await client.approveMetricReview(params.id);
  return { data: undefined };
}

export interface ListMetricReviewCommentsParams {
  id: MetricId;
}

export async function listMetricReviewComments(
  client: APIClient,
  params: ListMetricReviewCommentsParams,
): Promise<CommandResult<unknown>> {
  const data = await client.listMetricReviewComments(params.id);
  return { data };
}

export interface AddMetricReviewCommentParams {
  id: MetricId;
  message: string;
}

export async function addMetricReviewComment(
  client: APIClient,
  params: AddMetricReviewCommentParams,
): Promise<CommandResult<void>> {
  await client.addMetricReviewComment(params.id, params.message);
  return { data: undefined };
}

export interface ReplyToMetricReviewCommentParams {
  id: MetricId;
  commentId: number;
  message: string;
}

export async function replyToMetricReviewComment(
  client: APIClient,
  params: ReplyToMetricReviewCommentParams,
): Promise<CommandResult<void>> {
  await client.replyToMetricReviewComment(params.id, params.commentId, params.message);
  return { data: undefined };
}
