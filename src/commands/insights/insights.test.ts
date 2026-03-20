import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { insightsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('insights command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getVelocityInsights: vi.fn().mockResolvedValue({ data: [] }),
    getDecisionInsights: vi.fn().mockResolvedValue({ data: [] }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(insightsCommand);
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

  it('should get velocity insights', async () => {
    await insightsCommand.parseAsync([
      'node', 'test', 'velocity',
      '--from', '2026-01-01',
      '--to', '2026-03-01',
      '--aggregation', 'month',
    ]);

    expect(mockClient.getVelocityInsights).toHaveBeenCalledWith(
      expect.objectContaining({
        from: Math.floor(new Date('2026-01-01').getTime() / 1000),
        to: Math.floor(new Date('2026-03-01').getTime() / 1000),
        aggregation: 'month',
      })
    );
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get decision insights', async () => {
    await insightsCommand.parseAsync([
      'node', 'test', 'decisions',
      '--from', '2026-01-01',
      '--to', '2026-03-01',
      '--aggregation', 'week',
    ]);

    expect(mockClient.getDecisionInsights).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregation: 'week',
      })
    );
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should pass optional filters to velocity insights', async () => {
    await insightsCommand.parseAsync([
      'node', 'test', 'velocity',
      '--from', '2026-01-01',
      '--to', '2026-03-01',
      '--aggregation', 'day',
      '--unit-types', '1,2',
      '--teams', '3,4',
      '--owners', '5,6',
    ]);

    expect(mockClient.getVelocityInsights).toHaveBeenCalledWith(
      expect.objectContaining({
        unit_type_ids: [1, 2],
        team_ids: [3, 4],
        owner_ids: [5, 6],
      })
    );
  });
});
