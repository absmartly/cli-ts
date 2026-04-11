import { describe, it, expect, vi } from 'vitest';
import {
  listUpdateSchedules,
  getUpdateSchedule,
  createUpdateSchedule,
  updateUpdateSchedule,
  deleteUpdateSchedule,
} from './updateschedules.js';

describe('updateschedules', () => {
  const mockClient = {
    listUpdateSchedules: vi.fn(),
    getUpdateSchedule: vi.fn(),
    createUpdateSchedule: vi.fn(),
    updateUpdateSchedule: vi.fn(),
    deleteUpdateSchedule: vi.fn(),
  };

  it('should list update schedules', async () => {
    mockClient.listUpdateSchedules.mockResolvedValue([{ id: 1 }]);
    const result = await listUpdateSchedules(mockClient as any);
    expect(mockClient.listUpdateSchedules).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get update schedule by id', async () => {
    mockClient.getUpdateSchedule.mockResolvedValue({ id: 1, cron: '* * * * *' });
    const result = await getUpdateSchedule(mockClient as any, { id: 1 as any });
    expect(mockClient.getUpdateSchedule).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, cron: '* * * * *' });
  });

  it('should create update schedule', async () => {
    const config = { cron: '0 * * * *' };
    mockClient.createUpdateSchedule.mockResolvedValue({ id: 2 });
    const result = await createUpdateSchedule(mockClient as any, { config });
    expect(mockClient.createUpdateSchedule).toHaveBeenCalledWith(config);
    expect(result.data).toEqual({ id: 2 });
  });

  it('should update update schedule', async () => {
    const config = { cron: '0 0 * * *' };
    mockClient.updateUpdateSchedule.mockResolvedValue({ id: 1, cron: '0 0 * * *' });
    const result = await updateUpdateSchedule(mockClient as any, { id: 1 as any, config });
    expect(mockClient.updateUpdateSchedule).toHaveBeenCalledWith(1, config);
    expect(result.data).toEqual({ id: 1, cron: '0 0 * * *' });
  });

  it('should delete update schedule', async () => {
    mockClient.deleteUpdateSchedule.mockResolvedValue(undefined);
    const result = await deleteUpdateSchedule(mockClient as any, { id: 1 as any });
    expect(mockClient.deleteUpdateSchedule).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1 });
  });
});
