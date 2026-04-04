import { describe, it, expect, vi } from 'vitest';
import { listUnits, getUnit, createUnit, updateUnit, archiveUnit } from './units.js';

describe('units', () => {
  const mockClient = {
    listUnitTypes: vi.fn(),
    getUnitType: vi.fn(),
    createUnitType: vi.fn(),
    updateUnitType: vi.fn(),
    archiveUnitType: vi.fn(),
  };

  it('should list units with pagination', async () => {
    mockClient.listUnitTypes.mockResolvedValue([{ id: 1 }]);
    const result = await listUnits(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listUnitTypes).toHaveBeenCalledWith(25, 1);
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get unit by id', async () => {
    mockClient.getUnitType.mockResolvedValue({ id: 1, name: 'user_id' });
    const result = await getUnit(mockClient as any, { id: 1 as any });
    expect(mockClient.getUnitType).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, name: 'user_id' });
  });

  it('should create unit with name only', async () => {
    mockClient.createUnitType.mockResolvedValue({ id: 2 });
    const result = await createUnit(mockClient as any, { name: 'session_id' });
    expect(mockClient.createUnitType).toHaveBeenCalledWith({ name: 'session_id' });
    expect(result.data).toEqual({ id: 2 });
  });

  it('should create unit with description', async () => {
    mockClient.createUnitType.mockResolvedValue({ id: 3 });
    const result = await createUnit(mockClient as any, { name: 'session_id', description: 'desc' });
    expect(mockClient.createUnitType).toHaveBeenCalledWith({ name: 'session_id', description: 'desc' });
    expect(result.data).toEqual({ id: 3 });
  });

  it('should update unit with name', async () => {
    mockClient.updateUnitType.mockResolvedValue(undefined);
    const result = await updateUnit(mockClient as any, { id: 1 as any, name: 'updated' });
    expect(mockClient.updateUnitType).toHaveBeenCalledWith(1, { name: 'updated' });
    expect(result.data).toEqual({ id: 1 });
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateUnit(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });

  it('should archive unit', async () => {
    mockClient.archiveUnitType.mockResolvedValue(undefined);
    const result = await archiveUnit(mockClient as any, { id: 1 as any });
    expect(mockClient.archiveUnitType).toHaveBeenCalledWith(1, undefined);
    expect(result.data).toEqual({ id: 1, archived: true });
  });

  it('should unarchive unit', async () => {
    mockClient.archiveUnitType.mockResolvedValue(undefined);
    const result = await archiveUnit(mockClient as any, { id: 1 as any, unarchive: true });
    expect(mockClient.archiveUnitType).toHaveBeenCalledWith(1, true);
    expect(result.data).toEqual({ id: 1, archived: false });
  });
});
