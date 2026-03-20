import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInput = vi.fn();
const mockSelect = vi.fn();
const mockCheckbox = vi.fn();
const mockEditor = vi.fn();
const mockSearch = vi.fn();

vi.mock('@inquirer/prompts', () => ({
  input: (...args: unknown[]) => mockInput(...args),
  select: (...args: unknown[]) => mockSelect(...args),
  checkbox: (...args: unknown[]) => mockCheckbox(...args),
  editor: (...args: unknown[]) => mockEditor(...args),
  search: (...args: unknown[]) => mockSearch(...args),
  confirm: vi.fn(),
}));

import { InteractiveEditor } from './editor.js';
import type { EditorContext } from './types.js';
import type { ExperimentTemplate } from '../../api-client/template/parser.js';

function createMockContext(experimentType = 'test'): EditorContext {
  return {
    client: {
      listMetrics: vi.fn().mockResolvedValue([]),
      listUsers: vi.fn().mockResolvedValue([]),
    } as any,
    applications: [{ id: 1, name: 'web' }],
    unitTypes: [{ id: 1, name: 'user_id' }],
    teams: [{ id: 1, name: 'growth' }],
    experimentTags: [{ id: 1, tag: 'v1' }],
    customSectionFields: [],
    experimentType,
  };
}

function createBaseTemplate(): ExperimentTemplate {
  return {
    name: 'test_exp',
    display_name: 'Test Experiment',
    type: 'test',
    percentage_of_traffic: 100,
    percentages: '50/50',
    variants: [
      { variant: 0, name: 'control' },
      { variant: 1, name: 'treatment' },
    ],
    unit_type: 'user_id',
    application: 'web',
    primary_metric: 'conversion',
    secondary_metrics: [],
    guardrail_metrics: [],
    exploratory_metrics: [],
    owners: [],
    teams: [],
    tags: [],
    custom_fields: {},
  };
}

describe('InteractiveEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should navigate forward through all steps and confirm', async () => {
    const context = createMockContext();
    const editor = new InteractiveEditor(context);
    const template = createBaseTemplate();

    mockInput.mockResolvedValue('test_exp');
    mockSearch.mockResolvedValue('user_id');
    mockEditor.mockResolvedValue('');

    let selectCallCount = 0;
    mockSelect.mockImplementation((opts: any) => {
      selectCallCount++;
      const choices = opts.choices;
      if (choices?.some((c: any) => c.value === 'confirm')) return 'confirm';
      if (choices?.some((c: any) => c.value === 'done')) return 'done';
      if (choices?.some((c: any) => c.value === 'keep')) return 'keep';
      if (choices?.some((c: any) => c.value === 'next')) return 'next';
      return choices?.[0]?.value;
    });

    mockCheckbox.mockResolvedValue([]);

    const result = await editor.run(template);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('test_exp');
  });

  it('should return null when cancelled', async () => {
    const context = createMockContext();
    const editor = new InteractiveEditor(context);
    const template = createBaseTemplate();

    mockInput.mockResolvedValue('test_exp');

    mockSelect.mockImplementation((opts: any) => {
      const choices = opts.choices;
      if (choices?.some((c: any) => c.value === 'cancel')) return 'cancel';
      return choices?.[0]?.value;
    });

    const result = await editor.run(template);

    expect(result).toBeNull();
  });

  it('should navigate back from second step', async () => {
    const context = createMockContext();
    const editor = new InteractiveEditor(context);
    const template = createBaseTemplate();

    mockInput.mockResolvedValue('test_exp');
    mockSearch.mockResolvedValue('user_id');
    mockEditor.mockResolvedValue('');
    mockCheckbox.mockResolvedValue([]);

    let stepVisitCount = 0;
    mockSelect.mockImplementation((opts: any) => {
      stepVisitCount++;
      const choices = opts.choices;

      if (choices?.some((c: any) => c.value === 'done')) return 'done';
      if (choices?.some((c: any) => c.value === 'keep')) return 'keep';
      if (choices?.some((c: any) => c.value === 'confirm')) return 'confirm';

      if (stepVisitCount === 1) return 'next';
      if (stepVisitCount === 2) return 'back';

      return 'next';
    });

    const result = await editor.run(template);

    expect(result).not.toBeNull();
    expect(stepVisitCount).toBeGreaterThan(2);
  });

  it('should skip step and keep current values', async () => {
    const context = createMockContext();
    const editor = new InteractiveEditor(context);
    const template = createBaseTemplate();
    template.primary_metric = 'original_metric';

    mockInput.mockResolvedValue('test_exp');
    mockSearch.mockResolvedValue('user_id');
    mockEditor.mockResolvedValue('');
    mockCheckbox.mockResolvedValue([]);

    mockSelect.mockImplementation((opts: any) => {
      const choices = opts.choices;
      if (choices?.some((c: any) => c.value === 'done')) return 'done';
      if (choices?.some((c: any) => c.value === 'keep')) return 'keep';
      if (choices?.some((c: any) => c.value === 'confirm')) return 'confirm';
      if (choices?.some((c: any) => c.value === 'skip')) return 'skip';
      return choices?.[0]?.value;
    });

    const result = await editor.run(template);

    expect(result).not.toBeNull();
  });

  it('should jump to review step', async () => {
    const context = createMockContext();
    const editor = new InteractiveEditor(context);
    const template = createBaseTemplate();

    mockInput.mockResolvedValue('test_exp');

    let navCallCount = 0;
    mockSelect.mockImplementation((opts: any) => {
      navCallCount++;
      const choices = opts.choices;
      if (choices?.some((c: any) => c.value === 'confirm')) return 'confirm';

      if (navCallCount === 1) return 'review';

      return 'next';
    });

    const result = await editor.run(template);

    expect(result).not.toBeNull();
  });

  it('should skip analysis step for feature type', async () => {
    const context = createMockContext('feature');
    const editor = new InteractiveEditor(context);
    const template = createBaseTemplate();

    mockInput.mockResolvedValue('test_exp');
    mockSearch.mockResolvedValue('user_id');
    mockEditor.mockResolvedValue('');
    mockCheckbox.mockResolvedValue([]);

    const analysisChoicesSeen: string[] = [];
    mockSelect.mockImplementation((opts: any) => {
      const choices = opts.choices;
      if (choices?.some((c: any) => c.value === 'group_sequential')) {
        analysisChoicesSeen.push('analysis');
      }
      if (choices?.some((c: any) => c.value === 'confirm')) return 'confirm';
      if (choices?.some((c: any) => c.value === 'done')) return 'done';
      if (choices?.some((c: any) => c.value === 'keep')) return 'keep';
      if (choices?.some((c: any) => c.value === 'next')) return 'next';
      return choices?.[0]?.value;
    });

    await editor.run(template);

    expect(analysisChoicesSeen).toHaveLength(0);
  });
});
