import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { diffCommand } from './diff.js';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
} from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    printFormatted: vi.fn(),
  };
});

const makeExperiment = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'exp-a',
  display_name: 'Experiment A',
  type: 'test',
  state: 'running',
  percentage_of_traffic: 100,
  percentages: '50/50',
  applications: [{ application: { name: 'web' } }],
  unit_type: { name: 'user_id' },
  primary_metric: { name: 'Conversions' },
  variants: [
    { name: 'control', variant: 0 },
    { name: 'treatment', variant: 1 },
  ],
  owners: [{ user_id: 1, user: { first_name: 'Jane', last_name: 'Doe' } }],
  teams: [{ name: 'Growth' }],
  experiment_tags: [{ tag: { name: 'q1' } }],
  secondary_metrics: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  start_at: '2024-01-01T00:00:00Z',
  stop_at: '',
  ...overrides,
});

describe('diff command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    resolveExperimentId: vi.fn().mockImplementation((v: string) => {
      const n = Number(v);
      return Promise.resolve(isNaN(n) ? 123 : n);
    }),
    getExperiment: vi.fn(),
    listExperiments: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(diffCommand);
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

  it('should diff two experiments by ID', async () => {
    const exp1 = makeExperiment({ id: 1, name: 'exp-a', state: 'running' });
    const exp2 = makeExperiment({ id: 2, name: 'exp-b', state: 'stopped' });
    mockClient.getExperiment.mockImplementation((id: number) =>
      id === 1 ? Promise.resolve(exp1) : Promise.resolve(exp2)
    );

    await diffCommand.parseAsync(['node', 'test', '1', '2']);

    expect(mockClient.getExperiment).toHaveBeenCalledWith(1);
    expect(mockClient.getExperiment).toHaveBeenCalledWith(2);

    const rows = vi.mocked(printFormatted).mock.calls[0]![0] as Array<Record<string, string>>;
    const fields = rows.map((r) => r.field);
    expect(fields).toContain('id');
    expect(fields).toContain('name');
    expect(fields).toContain('state');
  });

  it('should show no differences for identical experiments', async () => {
    mockClient.getExperiment
      .mockResolvedValueOnce(structuredClone(makeExperiment()))
      .mockResolvedValueOnce(structuredClone(makeExperiment()));

    await diffCommand.parseAsync(['node', 'test', '1', '2']);

    expect(printFormatted).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('No differences found.');
  });

  it('should diff with --iteration flag', async () => {
    const current = makeExperiment({ id: 1, iteration: 2, state: 'running' });
    const iteration1 = makeExperiment({ id: 1, iteration: 1, state: 'stopped', name: 'exp-a-v1' });

    mockClient.getExperiment.mockResolvedValue(current);
    mockClient.listExperiments.mockResolvedValue([iteration1, current]);

    await diffCommand.parseAsync(['node', 'test', '1', '--iteration', '1']);

    expect(mockClient.listExperiments).toHaveBeenCalledWith({ iterations_of: 1 });
    const rows = vi.mocked(printFormatted).mock.calls[0]![0] as Array<Record<string, string>>;
    const fields = rows.map((r) => r.field);
    expect(fields).toContain('name');
  });

  it('should error when iteration not found', async () => {
    mockClient.getExperiment.mockResolvedValue(makeExperiment());
    mockClient.listExperiments.mockResolvedValue([
      makeExperiment({ iteration: 1 }),
      makeExperiment({ iteration: 2 }),
    ]);

    await expect(
      diffCommand.parseAsync(['node', 'test', '1', '--iteration', '99'])
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error:',
      expect.stringContaining('Iteration 99 not found')
    );
  });

  it('should diff raw API response with --raw', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table', raw: true } as any);
    const exp1 = makeExperiment({ id: 1, audience: '{"filter":[]}' });
    const exp2 = makeExperiment({ id: 2, audience: '{"filter":["age>18"]}' });
    mockClient.getExperiment.mockImplementation((id: number) =>
      id === 1 ? Promise.resolve(exp1) : Promise.resolve(exp2)
    );

    await diffCommand.parseAsync(['node', 'test', '1', '2']);

    const rows = vi.mocked(printFormatted).mock.calls[0]![0] as Array<Record<string, string>>;
    const fields = rows.map((r) => r.field);
    expect(fields).toContain('id');
    expect(fields).toContain('audience');
  });

  it('should error when no second ID and no --iteration', async () => {
    mockClient.getExperiment.mockResolvedValue(makeExperiment());

    await expect(diffCommand.parseAsync(['node', 'test', '1'])).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error:',
      expect.stringContaining('Provide a second experiment ID or use --iteration')
    );
  });
});
