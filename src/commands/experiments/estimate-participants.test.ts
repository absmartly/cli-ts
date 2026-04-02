import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { estimateParticipantsCommand } from './estimate-participants.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
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

  it('should resolve unit type by name', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', 'user_id',
      '--application', '1',
    ]);

    expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ unit_type_id: 42 })
    );
  });

  it('should resolve unit type by ID', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '1',
    ]);

    expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ unit_type_id: 42 })
    );
  });

  it('should resolve application by name', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', 'absmartly.com',
    ]);

    expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ applications: [1] })
    );
  });

  it('should resolve application by ID', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '2',
    ]);

    expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ applications: [2] })
    );
  });

  it('should support multiple --application flags', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', 'absmartly.com',
      '--application', 'mobile-app',
    ]);

    expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ applications: [1, 2] })
    );
  });

  it('should pass audience JSON when provided', async () => {
    const audience = '{"filter":{"and":[{"eq":[{"var":{"path":"application"}},{"value":"absmartly.com"}]}]}}';

    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '1',
      '--audience', audience,
    ]);

    expect(mockClient.estimateMaxParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ audience })
    );
  });

  it('should not include audience in payload when omitted', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '1',
    ]);

    const call = mockClient.estimateMaxParticipants.mock.calls[0]![0];
    expect(call).not.toHaveProperty('audience');
  });

  it('should include from timestamp in payload', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '1',
      '--from', '30d',
    ]);

    const call = mockClient.estimateMaxParticipants.mock.calls[0]![0];
    expect(typeof call.from).toBe('number');
    expect(call.from).toBeLessThan(Date.now());
  });

  it('should print formatted participant count', async () => {
    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '1',
    ]);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('1,945,010');
  });

  it('should print no-data message when rows are empty', async () => {
    mockClient.estimateMaxParticipants.mockResolvedValueOnce({
      ...ESTIMATE_RESPONSE,
      rows: [],
    });

    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '1',
    ]);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('No data');
  });

  it('should throw when --application is missing', async () => {
    await expect(
      estimateParticipantsCommand.parseAsync([
        'node', 'test',
        '--unit-type', '42',
      ])
    ).rejects.toThrow();
  });

  it('should print error when unit type name is not found', async () => {
    await expect(
      estimateParticipantsCommand.parseAsync([
        'node', 'test',
        '--unit-type', 'nonexistent',
        '--application', '1',
      ])
    ).rejects.toThrow('process.exit: 1');

    const errOutput = consoleErrorSpy.mock.calls.flat().join('\n');
    expect(errOutput).toContain('nonexistent');
  });

  it('should print error when application name is not found', async () => {
    await expect(
      estimateParticipantsCommand.parseAsync([
        'node', 'test',
        '--unit-type', '42',
        '--application', 'nonexistent-app',
      ])
    ).rejects.toThrow('process.exit: 1');

    const errOutput = consoleErrorSpy.mock.calls.flat().join('\n');
    expect(errOutput).toContain('nonexistent-app');
  });

  it('should output raw JSON when --output json', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'json' } as any);

    const printFormattedMock = vi.fn();
    const apiHelperModule = await import('../../lib/utils/api-helper.js');
    vi.spyOn(apiHelperModule, 'printFormatted').mockImplementation(printFormattedMock);

    await estimateParticipantsCommand.parseAsync([
      'node', 'test',
      '--unit-type', '42',
      '--application', '1',
    ]);

    expect(printFormattedMock).toHaveBeenCalledWith(ESTIMATE_RESPONSE, expect.objectContaining({ output: 'json' }));
  });
});
