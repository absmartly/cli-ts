import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId, NoteId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

// --- List activity ---
export interface ListExperimentActivityParams {
  experimentId: ExperimentId;
}

export async function listExperimentActivity(
  client: APIClient,
  params: ListExperimentActivityParams
): Promise<CommandResult<unknown[]>> {
  const notes = await client.listExperimentActivity(params.experimentId);
  return { data: notes as unknown[] };
}

// --- Create note ---
export interface CreateExperimentNoteParams {
  experimentId: ExperimentId;
  note: string;
}

export async function createExperimentNote(
  client: APIClient,
  params: CreateExperimentNoteParams
): Promise<CommandResult<{ id: number }>> {
  const note = await client.createExperimentNote(params.experimentId, params.note);
  return { data: { id: note.id } };
}

// --- Edit note ---
export interface EditExperimentNoteParams {
  experimentId: ExperimentId;
  noteId: NoteId;
  note: string;
}

export async function editExperimentNote(
  client: APIClient,
  params: EditExperimentNoteParams
): Promise<CommandResult<{ noteId: NoteId }>> {
  await client.editExperimentNote(params.experimentId, params.noteId, params.note);
  return { data: { noteId: params.noteId } };
}

// --- Reply to note ---
export interface ReplyToExperimentNoteParams {
  experimentId: ExperimentId;
  noteId: NoteId;
  note: string;
}

export async function replyToExperimentNote(
  client: APIClient,
  params: ReplyToExperimentNoteParams
): Promise<CommandResult<{ id: number }>> {
  const note = await client.replyToExperimentNote(params.experimentId, params.noteId, params.note);
  return { data: { id: note.id } };
}
