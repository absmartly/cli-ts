import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { estimateParticipantsCommand } from './estimate-participants.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

const ESTIMATE_RESPONSE = {
  columnNames: ['variant', 'first_exposure_at', 'last_exposure_at', 'last_event_at', 'unit_count'],
  columnTypes: ['UInt8', 'Int64', 'Int64', 'Int64', 'UInt32'],
  rows: [[0, 1769812802910, 1774995544371, 0, 1945010]],
};

describe('estimate-participants command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listApplications: vi.fn().mockResolvedValue([
      { id: 1, name: 'absmartly.com' },
      { id: 2, name: 'mobile-app' },
    ]),
    listUnitTypes: vi.fn().mockResolvedValue([
      { id: 42, name: 'user_id' },
      { id: 43, name: 'session_id' },
    ]),
    estimateMaxParticipants: vi.fn().mockResolvedValue(ESTIMATE_RESPONSE),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(estimateParticipantsCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
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

  describe('unit type resolution', () => {
    it('should resolve unit type by name', async () => {
      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', 'user_id']);

      expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
        expect.objectContaining({ unit_type_id: 42 })
      );
    });

    it('should resolve unit type by ID', async () => {
      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
        expect.objectContaining({ unit_type_id: 42 })
      );
    });

    it('should print error when unit type name is not found', async () => {
      await expect(
        estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', 'nonexistent'])
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain('nonexistent');
    });
  });

  describe('application resolution', () => {
    it('should work without --application', async () => {
      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(mockClient.listApplications).not.toHaveBeenCalled();
      const call = mockClient.estimateMaxParticipants.mock.calls[0]![0];
      expect(call).not.toHaveProperty('applications');
    });

    it('should resolve application by name', async () => {
      await estimateParticipantsCommand.parseAsync([
        'node', 'test', '--unit-type', '42', '--application', 'absmartly.com',
      ]);

      expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
        expect.objectContaining({ applications: [1] })
      );
    });

    it('should resolve application by ID', async () => {
      await estimateParticipantsCommand.parseAsync([
        'node', 'test', '--unit-type', '42', '--application', '2',
      ]);

      expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
        expect.objectContaining({ applications: [2] })
      );
    });

    it('should support multiple --application flags', async () => {
      await estimateParticipantsCommand.parseAsync([
        'node', 'test', '--unit-type', '42',
        '--application', 'absmartly.com',
        '--application', 'mobile-app',
      ]);

      expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
        expect.objectContaining({ applications: [1, 2] })
      );
    });

    it('should print error when application name is not found', async () => {
      await expect(
        estimateParticipantsCommand.parseAsync([
          'node', 'test', '--unit-type', '42', '--application', 'nonexistent-app',
        ])
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain('nonexistent-app');
    });
  });

  describe('audience', () => {
    it('should pass audience JSON when provided', async () => {
      const audience = '{"filter":{"and":[{"eq":[{"var":{"path":"application"}},{"value":"absmartly.com"}]}]}}';

      await estimateParticipantsCommand.parseAsync([
        'node', 'test', '--unit-type', '42', '--audience', audience,
      ]);

      expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
        expect.objectContaining({ audience })
      );
    });

    it('should not include audience in payload when omitted', async () => {
      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(mockClient.estimateMaxParticipants.mock.calls[0]![0]).not.toHaveProperty('audience');
    });

    it('should reject invalid audience JSON', async () => {
      await expect(
        estimateParticipantsCommand.parseAsync([
          'node', 'test', '--unit-type', '42', '--audience', '{invalid json}',
        ])
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain('Invalid JSON in --audience');
    });
  });

  describe('--from', () => {
    it('should include from timestamp in payload', async () => {
      await estimateParticipantsCommand.parseAsync([
        'node', 'test', '--unit-type', '42', '--from', '30d',
      ]);

      const call = mockClient.estimateMaxParticipants.mock.calls[0]![0];
      expect(typeof call.from).toBe('number');
      expect(call.from).toBeLessThan(Date.now());
    });

    it('should accept an ISO 8601 date for --from', async () => {
      await estimateParticipantsCommand.parseAsync([
        'node', 'test', '--unit-type', '42', '--from', '2024-01-01T00:00:00Z',
      ]);

      const call = mockClient.estimateMaxParticipants.mock.calls[0]![0];
      expect(call.from).toBe(new Date('2024-01-01T00:00:00Z').getTime());
    });
  });

  describe('human-readable output', () => {
    it('should print formatted participant count', async () => {
      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(consoleSpy.mock.calls.flat().join('\n')).toContain('1,945,010');
    });

    it('should print first and last exposure timestamps and window-from line', async () => {
      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('First exposure');
      expect(output).toContain('Last exposure');
      expect(output).toContain('Window from');
    });

    it('should print N/A for a zero timestamp', async () => {
      mockClient.estimateMaxParticipants.mockResolvedValueOnce({
        columnNames: ['first_exposure_at', 'unit_count'],
        columnTypes: ['Int64', 'UInt32'],
        rows: [[0, 500]],
      });

      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(consoleSpy.mock.calls.flat().join('\n')).toContain('N/A');
    });

    it('should print no-data message when rows are empty', async () => {
      mockClient.estimateMaxParticipants.mockResolvedValueOnce({ ...ESTIMATE_RESPONSE, rows: [] });

      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(consoleSpy.mock.calls.flat().join('\n')).toContain('No data');
    });

    it('should warn when unit_count column is absent', async () => {
      mockClient.estimateMaxParticipants.mockResolvedValueOnce({
        columnNames: ['first_exposure_at', 'last_exposure_at'],
        columnTypes: ['Int64', 'Int64'],
        rows: [[1769812802910, 1774995544371]],
      });

      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(consoleSpy.mock.calls.flat().join('\n')).toContain('"unit_count" not present');
    });

    it('should warn when API returns multiple rows', async () => {
      mockClient.estimateMaxParticipants.mockResolvedValueOnce({
        ...ESTIMATE_RESPONSE,
        rows: [[0, 1769812802910, 1774995544371, 0, 1000000], [0, 1769812802910, 1774995544371, 0, 945010]],
      });

      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(consoleSpy.mock.calls.flat().join('\n')).toContain('2 rows');
    });
  });

  describe('structured output', () => {
    it('should call printFormatted when --output json', async () => {
      vi.mocked(getGlobalOptions).mockReturnValue({ output: 'json' } as any);

      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(vi.mocked(printFormatted)).toHaveBeenCalledWith(
        ESTIMATE_RESPONSE,
        expect.objectContaining({ output: 'json' })
      );
    });

    it('should call printFormatted when --output yaml', async () => {
      vi.mocked(getGlobalOptions).mockReturnValue({ output: 'yaml' } as any);

      await estimateParticipantsCommand.parseAsync(['node', 'test', '--unit-type', '42']);

      expect(vi.mocked(printFormatted)).toHaveBeenCalledWith(
        ESTIMATE_RESPONSE,
        expect.objectContaining({ output: 'yaml' })
      );
    });
  });
});
