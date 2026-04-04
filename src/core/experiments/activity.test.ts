import { describe, it, expect, vi } from 'vitest';
import {
  listExperimentActivity,
  createExperimentNote,
  editExperimentNote,
  replyToExperimentNote,
} from './activity.js';

describe('experiments/activity', () => {
  const mockClient = {
    listExperimentActivity: vi.fn(),
    createExperimentNote: vi.fn(),
    editExperimentNote: vi.fn(),
    replyToExperimentNote: vi.fn(),
  };

  it('should list experiment activity', async () => {
    const notes = [{ id: 1, text: 'note' }];
    mockClient.listExperimentActivity.mockResolvedValue(notes);
    const result = await listExperimentActivity(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(notes);
  });

  it('should create experiment note', async () => {
    mockClient.createExperimentNote.mockResolvedValue({ id: 42 });
    const result = await createExperimentNote(mockClient as any, {
      experimentId: 10 as any,
      note: 'hello',
    });
    expect(mockClient.createExperimentNote).toHaveBeenCalledWith(10, 'hello');
    expect(result.data).toEqual({ id: 42 });
  });

  it('should edit experiment note', async () => {
    mockClient.editExperimentNote.mockResolvedValue(undefined);
    const result = await editExperimentNote(mockClient as any, {
      experimentId: 10 as any,
      noteId: 5 as any,
      note: 'updated',
    });
    expect(mockClient.editExperimentNote).toHaveBeenCalledWith(10, 5, 'updated');
    expect(result.data).toEqual({ noteId: 5 });
  });

  it('should reply to experiment note', async () => {
    mockClient.replyToExperimentNote.mockResolvedValue({ id: 99 });
    const result = await replyToExperimentNote(mockClient as any, {
      experimentId: 10 as any,
      noteId: 5 as any,
      note: 'reply text',
    });
    expect(mockClient.replyToExperimentNote).toHaveBeenCalledWith(10, 5, 'reply text');
    expect(result.data).toEqual({ id: 99 });
  });
});
