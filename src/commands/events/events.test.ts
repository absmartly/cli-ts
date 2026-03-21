import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('events command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listEvents: vi.fn().mockResolvedValue({ items: [{ id: 1, type: 'exposure' }], total: 1 }),
    listEventsHistory: vi.fn().mockResolvedValue({ history: [{ period: '2024-01-01', count: 100 }] }),
    getEventUnitData: vi.fn().mockResolvedValue({ units: [{ unit_type_id: 1, uid: 'user123', data: {} }] }),
    deleteEventUnitData: vi.fn().mockResolvedValue({ deleted: 1 }),
    getEventJsonValues: vi.fn().mockResolvedValue({ values: ['control', 'treatment'] }),
    getEventJsonLayouts: vi.fn().mockResolvedValue({ layouts: [{ path: 'variant', type: 'string' }] }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(eventsCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(printFormatted).mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should list events', async () => {
    await eventsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listEvents).toHaveBeenCalledWith({});
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list events with filters', async () => {
    await eventsCommand.parseAsync(['node', 'test', 'list', '--from', '1000', '--to', '2000', '--app', '1', '--items', '50']);

    expect(mockClient.listEvents).toHaveBeenCalledWith({
      filters: {
        from: 1000,
        to: 2000,
        applications: [1],
      },
      take: 50,
    });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list events history with filters', async () => {
    await eventsCommand.parseAsync(['node', 'test', 'history', '--from', '1000', '--to', '2000', '--period', '1d']);

    expect(mockClient.listEventsHistory).toHaveBeenCalledWith({
      filters: {
        from: 1000,
        to: 2000,
      },
      period: '1d',
    });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get event unit data', async () => {
    await eventsCommand.parseAsync(['node', 'test', 'unit-data', '1:user123', '2:device456']);

    expect(mockClient.getEventUnitData).toHaveBeenCalledWith({
      units: [
        { unit_type_id: 1, uid: 'user123' },
        { unit_type_id: 2, uid: 'device456' },
      ],
    });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should delete event unit data', async () => {
    await eventsCommand.parseAsync(['node', 'test', 'delete-unit-data', '1:user123']);

    expect(mockClient.deleteEventUnitData).toHaveBeenCalledWith({
      units: [{ unit_type_id: 1, uid: 'user123' }],
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unit data deleted for 1 unit(s)'));
  });

  it('should get event json values', async () => {
    await eventsCommand.parseAsync(['node', 'test', 'json-values', '--event-type', 'exposure', '--path', 'variant']);

    expect(mockClient.getEventJsonValues).toHaveBeenCalledWith({
      event_type: 'exposure',
      path: 'variant',
    });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get event json layouts', async () => {
    await eventsCommand.parseAsync(['node', 'test', 'json-layouts', '--source', 'unit_attribute', '--phase', 'after_enrichment']);

    expect(mockClient.getEventJsonLayouts).toHaveBeenCalledWith({
      source: 'unit_attribute',
      phase: 'after_enrichment',
    });
    expect(printFormatted).toHaveBeenCalled();
  });
});
