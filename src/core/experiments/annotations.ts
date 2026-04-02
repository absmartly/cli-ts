import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { AnnotationId, ExperimentId } from '../../lib/api/branded-types.js';

// --- List annotations ---
export interface ListAnnotationsParams {
  experimentId: ExperimentId;
}

export async function listAnnotations(
  client: APIClient,
  params: ListAnnotationsParams,
): Promise<CommandResult<unknown[]>> {
  const annotations = await client.listAnnotations(params.experimentId);
  return { data: annotations as unknown[] };
}

// --- Create annotation ---
export interface CreateAnnotationParams {
  experimentId: ExperimentId;
  type?: string;
}

export async function createAnnotation(
  client: APIClient,
  params: CreateAnnotationParams,
): Promise<CommandResult<unknown>> {
  const data: { experiment_id: number; type?: string } = { experiment_id: params.experimentId };
  if (params.type !== undefined) data.type = params.type;
  const annotation = await client.createAnnotation(data);
  return { data: annotation };
}

// --- Update annotation ---
export interface UpdateAnnotationParams {
  annotationId: AnnotationId;
  type?: string;
}

export async function updateAnnotation(
  client: APIClient,
  params: UpdateAnnotationParams,
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.type !== undefined) data.type = params.type;
  if (Object.keys(data).length === 0) {
    throw new Error('At least one update field is required');
  }
  const annotation = await client.updateAnnotation(params.annotationId, data);
  return { data: annotation };
}

// --- Archive annotation ---
export interface ArchiveAnnotationParams {
  annotationId: AnnotationId;
  unarchive?: boolean;
}

export async function archiveAnnotation(
  client: APIClient,
  params: ArchiveAnnotationParams,
): Promise<CommandResult<{ annotationId: AnnotationId; action: string }>> {
  await client.archiveAnnotation(params.annotationId, !!params.unarchive);
  const action = params.unarchive ? 'unarchived' : 'archived';
  return { data: { annotationId: params.annotationId, action } };
}
