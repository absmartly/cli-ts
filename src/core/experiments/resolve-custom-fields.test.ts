import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCustomFieldValues } from './resolve-custom-fields.js';

describe('resolve-custom-fields', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      listCustomSectionFields: vi.fn(),
    };
  });

  it('resolves matching custom field values by title', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([
      {
        id: 10,
        name: 'field1',
        title: 'My Field',
        type: 'text',
        archived: false,
        custom_section: { type: 'experiment', archived: false },
      },
    ]);
    const result = await resolveCustomFieldValues(mockClient as any, {
      customFieldValues: { 'My Field': 'hello' },
      defaultType: 'experiment',
    });
    expect(result).toEqual({ 10: { type: 'text', value: 'hello' } });
  });

  it('ignores archived fields', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([
      {
        id: 10,
        name: 'field1',
        title: 'Archived Field',
        type: 'text',
        archived: true,
        custom_section: { type: 'experiment', archived: false },
      },
    ]);
    const result = await resolveCustomFieldValues(mockClient as any, {
      customFieldValues: { 'Archived Field': 'val' },
      defaultType: 'experiment',
    });
    expect(result).toEqual({});
  });

  it('ignores fields from archived sections', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([
      {
        id: 10,
        name: 'f',
        title: 'F',
        type: 'text',
        archived: false,
        custom_section: { type: 'experiment', archived: true },
      },
    ]);
    const result = await resolveCustomFieldValues(mockClient as any, {
      customFieldValues: { F: 'val' },
      defaultType: 'experiment',
    });
    expect(result).toEqual({});
  });

  it('ignores fields with different section type', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([
      {
        id: 10,
        name: 'f',
        title: 'F',
        type: 'text',
        archived: false,
        custom_section: { type: 'feature', archived: false },
      },
    ]);
    const result = await resolveCustomFieldValues(mockClient as any, {
      customFieldValues: { F: 'val' },
      defaultType: 'experiment',
    });
    expect(result).toEqual({});
  });

  it('falls back to name when title is missing', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([
      {
        id: 10,
        name: 'field_name',
        type: 'number',
        archived: false,
        custom_section: { type: 'experiment', archived: false },
      },
    ]);
    const result = await resolveCustomFieldValues(mockClient as any, {
      customFieldValues: { field_name: '42' },
      defaultType: 'experiment',
    });
    expect(result).toEqual({ 10: { type: 'number', value: '42' } });
  });

  it('returns empty when no fields match', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([
      {
        id: 10,
        name: 'f',
        title: 'F',
        type: 'text',
        archived: false,
        custom_section: { type: 'experiment', archived: false },
      },
    ]);
    const result = await resolveCustomFieldValues(mockClient as any, {
      customFieldValues: { 'Nonexistent': 'val' },
      defaultType: 'experiment',
    });
    expect(result).toEqual({});
  });

  it('resolves multiple fields at once', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([
      {
        id: 1,
        name: 'a',
        title: 'Alpha',
        type: 'text',
        archived: false,
        custom_section: { type: 'experiment', archived: false },
      },
      {
        id: 2,
        name: 'b',
        title: 'Beta',
        type: 'number',
        archived: false,
        custom_section: { type: 'experiment', archived: false },
      },
    ]);
    const result = await resolveCustomFieldValues(mockClient as any, {
      customFieldValues: { Alpha: 'a-val', Beta: '123' },
      defaultType: 'experiment',
    });
    expect(result).toEqual({
      1: { type: 'text', value: 'a-val' },
      2: { type: 'number', value: '123' },
    });
  });
});
