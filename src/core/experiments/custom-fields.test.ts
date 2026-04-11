import { describe, it, expect, vi } from 'vitest';
import {
  listCustomFields,
  getCustomField,
  createCustomField,
  updateCustomField,
  archiveCustomField,
} from './custom-fields.js';

vi.mock('../../api-client/entity-summary.js', () => ({
  summarizeCustomFieldRow: (f: Record<string, unknown>) => ({ id: f.id, name: f.name }),
  summarizeCustomField: (f: Record<string, unknown>) => ({ id: f.id, name: f.name }),
  applyShowExclude: (_summary: unknown, _raw: unknown, _show: string[], _exclude: string[]) => ({
    id: 1,
    name: 'filtered',
  }),
}));

describe('experiments/custom-fields', () => {
  const mockClient = {
    listCustomSectionFields: vi.fn(),
    getCustomSectionField: vi.fn(),
    createCustomSectionField: vi.fn(),
    updateCustomSectionField: vi.fn(),
    archiveCustomSectionField: vi.fn(),
  };

  it('should list custom fields filtered by type', async () => {
    const fields = [
      { id: 1, name: 'f1', custom_section: { type: 'experiment' } },
      { id: 2, name: 'f2', custom_section: { type: 'other' } },
    ];
    mockClient.listCustomSectionFields.mockResolvedValue(fields);
    const result = await listCustomFields(mockClient as any, { type: 'experiment' });
    expect(mockClient.listCustomSectionFields).toHaveBeenCalledWith(100, 1);
    expect(result.data).toEqual([fields[0]]);
  });

  it('should list custom fields with pagination params', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([]);
    const result = await listCustomFields(mockClient as any, {
      type: 'experiment',
      items: 50,
      page: 2,
    });
    expect(mockClient.listCustomSectionFields).toHaveBeenCalledWith(50, 2);
    expect(result.pagination).toEqual({ page: 2, items: 50, hasMore: false });
  });

  it('should list custom fields raw', async () => {
    const fields = [{ id: 1, name: 'f1', custom_section: { type: 'experiment' } }];
    mockClient.listCustomSectionFields.mockResolvedValue(fields);
    const result = await listCustomFields(mockClient as any, { type: 'experiment', raw: true });
    expect(result.rows).toEqual(fields);
  });

  it('should get custom field', async () => {
    const field = { id: 1, name: 'field1' };
    mockClient.getCustomSectionField.mockResolvedValue(field);
    const result = await getCustomField(mockClient as any, { id: 1 as any });
    expect(mockClient.getCustomSectionField).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, name: 'filtered' });
  });

  it('should get custom field raw', async () => {
    const field = { id: 1, name: 'field1' };
    mockClient.getCustomSectionField.mockResolvedValue(field);
    const result = await getCustomField(mockClient as any, { id: 1 as any, raw: true });
    expect(result.data).toEqual(field);
  });

  it('should create custom field', async () => {
    const field = { id: 2, name: 'new' };
    mockClient.createCustomSectionField.mockResolvedValue(field);
    const result = await createCustomField(mockClient as any, { name: 'new', type: 'text' });
    expect(mockClient.createCustomSectionField).toHaveBeenCalledWith({ name: 'new', type: 'text' });
    expect(result.data).toEqual(field);
  });

  it('should create custom field with default value', async () => {
    mockClient.createCustomSectionField.mockResolvedValue({ id: 3 });
    await createCustomField(mockClient as any, { name: 'f', type: 'text', defaultValue: 'def' });
    expect(mockClient.createCustomSectionField).toHaveBeenCalledWith({
      name: 'f',
      type: 'text',
      default_value: 'def',
    });
  });

  it('should update custom field', async () => {
    const field = { id: 1, name: 'updated' };
    mockClient.updateCustomSectionField.mockResolvedValue(field);
    const result = await updateCustomField(mockClient as any, { id: 1 as any, name: 'updated' });
    expect(mockClient.updateCustomSectionField).toHaveBeenCalledWith(1, { name: 'updated' });
    expect(result.data).toEqual(field);
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateCustomField(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field is required'
    );
  });

  it('should archive custom field', async () => {
    mockClient.archiveCustomSectionField.mockResolvedValue(undefined);
    const result = await archiveCustomField(mockClient as any, { id: 1 as any });
    expect(mockClient.archiveCustomSectionField).toHaveBeenCalledWith(1, false);
    expect(result.data).toEqual({ id: 1, action: 'archived' });
  });

  it('should unarchive custom field', async () => {
    mockClient.archiveCustomSectionField.mockResolvedValue(undefined);
    const result = await archiveCustomField(mockClient as any, { id: 1 as any, unarchive: true });
    expect(mockClient.archiveCustomSectionField).toHaveBeenCalledWith(1, true);
    expect(result.data).toEqual({ id: 1, action: 'unarchived' });
  });
});
