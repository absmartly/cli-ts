import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCommand } from './get.js';
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

const fullExperiment = {
  id: 42,
  name: 'test-exp',
  display_name: 'Test Exp',
  type: 'test',
  state: 'running',
  percentage_of_traffic: 100,
  percentages: '50/50',
  applications: [{ name: 'web' }],
  unit_type: { name: 'user_id' },
  primary_metric: { name: 'Conversions' },
  variants: [
    { name: 'control', variant: 0, config: '{}' },
    { name: 'treatment', variant: 1, config: '{}' },
  ],
  owners: [{ user_id: 1, user: { first_name: 'Jane', last_name: 'Doe' } }],
  teams: [{ name: 'Growth' }],
  experiment_tags: [{ tag: { name: 'q1' } }],
  secondary_metrics: [],
  audience: '{"filter":[]}',
  archived: false,
  custom_section_field_values: [
    {
      value: 'Red button converts better',
      custom_section_field: { title: 'Hypothesis' },
    },
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  start_at: '2024-01-01T00:00:00Z',
  stop_at: '',
};

describe('get command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    resolveExperimentId: vi.fn().mockImplementation((v: string) => Promise.resolve(Number(v))),
    getExperiment: vi.fn().mockResolvedValue(fullExperiment),
    listExperimentActivity: vi.fn().mockResolvedValue([{ id: 1, text: 'note' }]),
    listUsers: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(getCommand);
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

  it('should get experiment by ID and show summary', async () => {
    await getCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.getExperiment).toHaveBeenCalledWith(42);
    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.id).toBe(42);
    expect(data.name).toBe('test-exp');
    expect(data.application).toBe('web');
    expect(data.unit_type).toBe('user_id');
    expect(data.primary_metric).toBe('Conversions');
    expect(data.variants).toBe('control, treatment');
    expect(data.owners).toBe('Jane Doe');
    expect(data.teams).toBe('Growth');
    expect(data.tags).toBe('q1');
  });

  it('should include activity with --activity flag', async () => {
    await getCommand.parseAsync(['node', 'test', '42', '--activity']);

    expect(mockClient.getExperiment).toHaveBeenCalledWith(42);
    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(42);
    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.id).toBe(42);
    expect(data.name).toBe('test-exp');
  });

  it('should not fetch activity without --activity flag', async () => {
    await getCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.listExperimentActivity).not.toHaveBeenCalled();
  });

  it('should show raw response with --raw', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table', raw: true } as any);

    await getCommand.parseAsync(['node', 'test', '42']);

    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.applications).toBeDefined();
    expect(data.variants).toEqual(fullExperiment.variants);
  });

  it('should show summary with -o json by default', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'json' } as any);

    await getCommand.parseAsync(['node', 'test', '42']);

    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.id).toBe(42);
    expect(data.application).toBeDefined();
    expect(data.applications).toBeUndefined();
  });

  it('should show raw response with --raw -o json', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'json', raw: true } as any);

    await getCommand.parseAsync(['node', 'test', '42']);

    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.applications).toBeDefined();
  });

  it('should include extra fields with --show', async () => {
    await getCommand.parseAsync(['node', 'test', '42', '--show', 'audience']);

    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.id).toBe(42);
    expect('audience' in data).toBe(true);
  });

  it('should include custom fields by title with --show', async () => {
    await getCommand.parseAsync(['node', 'test', '42', '--show', 'Hypothesis']);

    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.Hypothesis).toBe('Red button converts better');
  });

  it('should output markdown template with --output template', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'template' } as any);

    await getCommand.parseAsync(['node', 'test', '42']);

    expect(printFormatted).not.toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).toContain('---');
    expect(output).toContain('name: test-exp');
    expect(output).toContain('display_name: Test Exp');
    expect(output).toContain('### variant_0');
    expect(output).toContain('### variant_1');
  });

  it('should show metric types in summary', async () => {
    mockClient.getExperiment.mockResolvedValue({
      ...fullExperiment,
      secondary_metrics: [
        { type: 'secondary', metric: { name: 'Revenue' } },
        { type: 'guardrail', metric: { name: 'Error Rate' } },
        { type: 'exploratory', metric: { name: 'Bounce Rate' } },
      ],
    });

    await getCommand.parseAsync(['node', 'test', '42']);

    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(data.secondary_metrics).toBe('Revenue');
    expect(data.guardrail_metrics).toBe('Error Rate');
    expect(data.exploratory_metrics).toBe('Bounce Rate');
  });

  it('forwards --show-only to getExperiment and outputs only those fields', async () => {
    await getCommand.parseAsync(['node', 'test', '42', '--show-only', 'id', 'audience']);

    const data = vi.mocked(printFormatted).mock.calls[0]![0] as Record<string, unknown>;
    expect(Object.keys(data)).toEqual(['id', 'audience']);
    expect(data.audience).toEqual({ filter: [] });
  });

  it('rejects --show-only combined with --show', async () => {
    try {
      await getCommand.parseAsync(['node', 'test', '42', '--show-only', 'id', '--show', 'audience']);
    } catch (_e) {
      // process.exit threw a sentinel
    }
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error:',
      '--show-only is mutually exclusive with --show and --exclude'
    );
  });

  it('rejects --show-only combined with --exclude', async () => {
    try {
      await getCommand.parseAsync(['node', 'test', '42', '--show-only', 'id', '--exclude', 'tags']);
    } catch (_e) {
      // process.exit threw a sentinel
    }
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error:',
      '--show-only is mutually exclusive with --show and --exclude'
    );
  });

  it('renders default sections when no filters are passed', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'rendered' } as any);

    await getCommand.parseAsync(['node', 'test', '42']);

    expect(printFormatted).not.toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).toContain('Test Exp'); // display_name in title
    expect(output).toContain('## Audience');
    expect(output).toContain('## Variants');
    expect(output).toContain('### Hypothesis');
    expect(output).toContain('Created:');
  });

  it('renders --exclude audience without ## Audience section', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'rendered' } as any);

    await getCommand.parseAsync(['node', 'test', '42', '--exclude', 'audience']);

    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).not.toContain('## Audience');
    expect(output).toContain('## Variants'); // unrelated section still present
  });

  it('renders --exclude Hypothesis without that custom field section', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'rendered' } as any);

    await getCommand.parseAsync(['node', 'test', '42', '--exclude', 'Hypothesis']);

    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).not.toContain('### Hypothesis');
    expect(output).toContain('## Audience'); // unrelated section still present
  });

  it('renders --show-only id name audience minimally', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'rendered' } as any);

    await getCommand.parseAsync([
      'node', 'test', '42', '--show-only', 'id', 'name', 'audience',
    ]);

    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).toContain('42');
    expect(output).toContain('test-exp');
    expect(output).toContain('## Audience');
    expect(output).not.toContain('## Variants');
    expect(output).not.toContain('### Hypothesis');
    expect(output).toContain('Created:'); // footer always renders
  });

  it('renders --show description adds the description row', async () => {
    mockClient.getExperiment.mockResolvedValueOnce({
      ...fullExperiment,
      description: 'long-form description',
    });
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'rendered' } as any);

    await getCommand.parseAsync(['node', 'test', '42', '--show', 'description']);

    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).toContain('long-form description');
    expect(output).toContain('## Audience'); // implicit defaults still kick in
  });
});
