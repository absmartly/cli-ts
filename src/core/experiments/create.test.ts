import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExperiment, createExperimentFromTemplate } from './create.js';

vi.mock('../../api-client/template/parser.js', () => ({
  parseExperimentMarkdown: vi.fn().mockReturnValue({
    name: 'from-template',
    display_name: 'From Template',
    type: 'test',
  }),
}));

vi.mock('../../api-client/template/build-from-template.js', () => ({
  buildPayloadFromTemplate: vi.fn().mockResolvedValue({
    payload: { name: 'from-template', display_name: 'From Template', type: 'test' },
    warnings: ['Metric "Revenue" not found, skipping'],
  }),
}));

describe('createExperiment', () => {
  const mockClient = {
    createExperiment: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('should create experiment and return id, name, type', async () => {
    mockClient.createExperiment.mockResolvedValue({ id: 42, name: 'test-exp', type: 'test' });

    const result = await createExperiment(mockClient as any, { name: 'test-exp', type: 'test' });

    expect(mockClient.createExperiment).toHaveBeenCalledWith({ name: 'test-exp', type: 'test' });
    expect(result.data).toEqual({ id: 42, name: 'test-exp', type: 'test' });
  });
});

describe('createExperimentFromTemplate', () => {
  const mockClient = {
    createExperiment: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('should parse template, build payload, and create experiment', async () => {
    mockClient.createExperiment.mockResolvedValue({ id: 99, name: 'from-template', type: 'test' });

    const result = await createExperimentFromTemplate(mockClient as any, {
      templateContent: '---\nname: from-template\n---\n# Description',
    });

    expect(result.data).toEqual({ id: 99, name: 'from-template', type: 'test' });
    expect(result.warnings).toEqual(['Metric "Revenue" not found, skipping']);
  });

  it('should override name and displayName from params', async () => {
    const { parseExperimentMarkdown } = await import('../../api-client/template/parser.js');
    const template = { name: 'original', display_name: 'Original' };
    vi.mocked(parseExperimentMarkdown).mockReturnValue(template as any);

    mockClient.createExperiment.mockResolvedValue({ id: 100, name: 'overridden', type: 'test' });

    await createExperimentFromTemplate(mockClient as any, {
      templateContent: '---\nname: original\n---',
      name: 'overridden',
      displayName: 'Overridden Name',
    });

    expect(template.name).toBe('overridden');
    expect(template.display_name).toBe('Overridden Name');
  });

  it('should pass defaultType to buildPayloadFromTemplate', async () => {
    const { buildPayloadFromTemplate } = await import('../../api-client/template/build-from-template.js');
    mockClient.createExperiment.mockResolvedValue({ id: 101, name: 'feat', type: 'feature' });

    await createExperimentFromTemplate(mockClient as any, {
      templateContent: '---\nname: feat\n---',
      defaultType: 'feature',
    });

    expect(buildPayloadFromTemplate).toHaveBeenCalledWith(
      mockClient,
      expect.anything(),
      'feature',
    );
  });

  it('should default to type test when no defaultType', async () => {
    const { buildPayloadFromTemplate } = await import('../../api-client/template/build-from-template.js');
    mockClient.createExperiment.mockResolvedValue({ id: 102, name: 'exp', type: 'test' });

    await createExperimentFromTemplate(mockClient as any, {
      templateContent: '---\nname: exp\n---',
    });

    expect(buildPayloadFromTemplate).toHaveBeenCalledWith(
      mockClient,
      expect.anything(),
      'test',
    );
  });
});
