import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeCommand } from './analyze.js';
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

const fakeExperiment = {
  id: 42,
  name: 'demo',
  type: 'test',
  state: 'running',
  primary_metric_id: 100,
  primary_metric: { id: 100, name: 'Conversions' },
  unit_type: { id: 1, name: 'user_id' },
  variants: [
    { variant: 0, name: 'control' },
    { variant: 1, name: 'treatment' },
  ],
  secondary_metrics: [],
  alerts: [],
  metrics_snapshot: undefined,
  hypothesis: 'h',
  required_alpha: '0.05',
  analysis_type: 'group_sequential',
  minimum_detectable_effect: 5,
  percentage_of_traffic: 100,
  started_at: new Date().toISOString(),
};

describe('analyze command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    resolveExperimentId: vi.fn().mockImplementation((v: string) => Promise.resolve(Number(v))),
    getExperiment: vi.fn().mockResolvedValue(fakeExperiment),
    listExperiments: vi.fn().mockResolvedValue([]),
    getExperimentMetricsCached: vi.fn(),
    listExperimentAlerts: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(analyzeCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'json' } as any);
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

  it('runs analyze and prints AnalyzeResult', async () => {
    await analyzeCommand.parseAsync(['node', 'test', '42']);
    expect(mockClient.resolveExperimentId).toHaveBeenCalledWith('42');
    expect(mockClient.getExperiment).toHaveBeenCalledWith(42);
    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect((data.experiment as Record<string, unknown>).id).toBe(42);
    expect(Array.isArray(data.heuristic_output)).toBe(true);
  });
});
