import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCustomFields } from './list.js';
import { getCustomField } from './get.js';
import { createCustomField } from './create.js';
import { updateCustomField } from './update.js';
import { archiveCustomField } from './archive.js';

const mockClient = {
  listCustomSectionFields: vi.fn(),
  getCustomSectionField: vi.fn(),
  createCustomSectionField: vi.fn(),
  updateCustomSectionField: vi.fn(),
  archiveCustomSectionField: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('listCustomFields', () => {
  it('should list custom fields with rows', async () => {
    const fields = [
      { id: 1, name: 'Field A' },
      { id: 2, name: 'Field B' },
    ];
    mockClient.listCustomSectionFields.mockResolvedValue(fields);

    const result = await listCustomFields(mockClient, { items: 10, page: 1 });

    expect(mockClient.listCustomSectionFields).toHaveBeenCalledWith(10, 1);
    expect(result.data).toEqual(fields);
    expect(result.rows).toBeDefined();
  });
});

describe('getCustomField', () => {
  it('should get field by id', async () => {
    const field = { id: 5, name: 'Custom' };
    mockClient.getCustomSectionField.mockResolvedValue(field);

    const result = await getCustomField(mockClient, { id: 5 as any });

    expect(mockClient.getCustomSectionField).toHaveBeenCalledWith(5);
    expect(result.data).toBeDefined();
  });

  it('should return raw data when raw=true', async () => {
    const field = { id: 5, name: 'Custom', extra: 'stuff' };
    mockClient.getCustomSectionField.mockResolvedValue(field);

    const result = await getCustomField(mockClient, { id: 5 as any, raw: true });

    expect(result.data).toEqual(field);
  });
});

describe('createCustomField', () => {
  it('should create with required fields', async () => {
    const created = { id: 10 };
    mockClient.createCustomSectionField.mockResolvedValue(created);

    const result = await createCustomField(mockClient, { name: 'Field', type: 'text' });

    expect(mockClient.createCustomSectionField).toHaveBeenCalledWith({
      name: 'Field',
      type: 'text',
    });
    expect(result).toEqual({ data: created });
  });

  it('should include defaultValue', async () => {
    mockClient.createCustomSectionField.mockResolvedValue({ id: 11 });

    await createCustomField(mockClient, { name: 'F', type: 'text', defaultValue: 'N/A' });

    expect(mockClient.createCustomSectionField).toHaveBeenCalledWith({
      name: 'F',
      type: 'text',
      default_value: 'N/A',
    });
  });
});

describe('updateCustomField', () => {
  it('should update name', async () => {
    mockClient.updateCustomSectionField.mockResolvedValue({ id: 5 });

    const result = await updateCustomField(mockClient, { id: 5 as any, name: 'new-name' });

    expect(mockClient.updateCustomSectionField).toHaveBeenCalledWith(5, { name: 'new-name' });
    expect(result).toEqual({ data: { id: 5 } });
  });

  it('should update multiple fields', async () => {
    mockClient.updateCustomSectionField.mockResolvedValue({ id: 5 });

    await updateCustomField(mockClient, {
      id: 5 as any,
      name: 'N',
      type: 'number',
      defaultValue: '0',
    });

    expect(mockClient.updateCustomSectionField).toHaveBeenCalledWith(5, {
      name: 'N',
      type: 'number',
      default_value: '0',
    });
  });

  it('should throw when no fields provided', async () => {
    await expect(updateCustomField(mockClient, { id: 5 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });
});

describe('archiveCustomField', () => {
  it('should archive a field', async () => {
    mockClient.archiveCustomSectionField.mockResolvedValue(undefined);

    const result = await archiveCustomField(mockClient, { id: 3 as any });

    expect(mockClient.archiveCustomSectionField).toHaveBeenCalledWith(3, false);
    expect(result).toEqual({ data: { id: 3, archived: true } });
  });

  it('should unarchive a field', async () => {
    mockClient.archiveCustomSectionField.mockResolvedValue(undefined);

    const result = await archiveCustomField(mockClient, { id: 3 as any, unarchive: true });

    expect(mockClient.archiveCustomSectionField).toHaveBeenCalledWith(3, true);
    expect(result).toEqual({ data: { id: 3, archived: false } });
  });
});
