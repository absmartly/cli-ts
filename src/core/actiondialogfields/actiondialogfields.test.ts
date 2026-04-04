import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listActionDialogFields,
  getActionDialogField,
  createActionDialogField,
  updateActionDialogField,
} from './actiondialogfields.js';

const mockClient = {
  listExperimentActionDialogFields: vi.fn(),
  getExperimentActionDialogField: vi.fn(),
  createExperimentActionDialogField: vi.fn(),
  updateExperimentActionDialogField: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('listActionDialogFields', () => {
  it('should call client.listExperimentActionDialogFields and return data', async () => {
    const mockData = [{ id: 1 }, { id: 2 }];
    mockClient.listExperimentActionDialogFields.mockResolvedValue(mockData);

    const result = await listActionDialogFields(mockClient);

    expect(mockClient.listExperimentActionDialogFields).toHaveBeenCalledOnce();
    expect(result).toEqual({ data: mockData });
  });
});

describe('getActionDialogField', () => {
  it('should call client.getExperimentActionDialogField with the id', async () => {
    const mockData = { id: 5, name: 'field' };
    mockClient.getExperimentActionDialogField.mockResolvedValue(mockData);

    const result = await getActionDialogField(mockClient, { id: 5 });

    expect(mockClient.getExperimentActionDialogField).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: mockData });
  });
});

describe('createActionDialogField', () => {
  it('should call client.createExperimentActionDialogField with config', async () => {
    const config = { name: 'new field', type: 'text' };
    const mockData = { id: 10, ...config };
    mockClient.createExperimentActionDialogField.mockResolvedValue(mockData);

    const result = await createActionDialogField(mockClient, { config });

    expect(mockClient.createExperimentActionDialogField).toHaveBeenCalledWith(config);
    expect(result).toEqual({ data: mockData });
  });
});

describe('updateActionDialogField', () => {
  it('should call client.updateExperimentActionDialogField with id and config', async () => {
    const config = { name: 'updated' };
    const mockData = { id: 3, name: 'updated' };
    mockClient.updateExperimentActionDialogField.mockResolvedValue(mockData);

    const result = await updateActionDialogField(mockClient, { id: 3, config });

    expect(mockClient.updateExperimentActionDialogField).toHaveBeenCalledWith(3, config);
    expect(result).toEqual({ data: mockData });
  });
});
