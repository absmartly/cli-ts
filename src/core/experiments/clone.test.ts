import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildClonePayload, cloneExperiment } from './clone.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

vi.mock('../../api-client/template/serializer.js', () => ({
  experimentToMarkdown: vi.fn().mockResolvedValue('# Test Markdown'),
}));

vi.mock('../../api-client/template/parser.js', () => ({
  parseExperimentMarkdown: vi.fn().mockReturnValue({ name: 'parsed', display_name: 'Parsed' }),
}));

vi.mock('../../api-client/template/build-from-template.js', () => ({
  buildPayloadFromTemplate: vi.fn().mockResolvedValue({
    payload: { name: 'built', state: 'created' },
    warnings: [],
  }),
}));

vi.mock('../../api-client/template/merge-overrides.js', () => ({
  mergeTemplateOverrides: vi.fn().mockReturnValue({ name: 'merged', display_name: 'Merged' }),
}));

import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { mergeTemplateOverrides } from '../../api-client/template/merge-overrides.js';

const id = (n: number) => n as ExperimentId;

describe('clone', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      getExperiment: vi.fn().mockResolvedValue({ name: 'Source Exp', variant_screenshots: [] }),
      createExperiment: vi.fn().mockResolvedValue({ id: 200, name: 'Cloned', type: 'experiment' }),
    };
  });

  describe('buildClonePayload', () => {
    const baseParams = {
      experimentId: id(1),
      defaultType: 'experiment',
      apiEndpoint: 'https://api.example.com',
    };

    it('serializes source experiment to markdown and parses it', async () => {
      await buildClonePayload(mockClient as any, baseParams);
      expect(mockClient.getExperiment).toHaveBeenCalledWith(id(1));
      expect(experimentToMarkdown).toHaveBeenCalled();
      expect(parseExperimentMarkdown).toHaveBeenCalledWith('# Test Markdown');
      expect(buildPayloadFromTemplate).toHaveBeenCalled();
    });

    it('uses overrideContent string without file reading', async () => {
      const params = { ...baseParams, overrideContent: '# Override' };
      await buildClonePayload(mockClient as any, params);
      expect(parseExperimentMarkdown).toHaveBeenCalledWith('# Override');
      expect(mergeTemplateOverrides).toHaveBeenCalled();
    });

    it('does not merge overrides when overrideContent is undefined', async () => {
      await buildClonePayload(mockClient as any, baseParams);
      expect(mergeTemplateOverrides).not.toHaveBeenCalled();
    });

    it('overrides name when provided', async () => {
      const params = { ...baseParams, name: 'custom-name' };
      await buildClonePayload(mockClient as any, params);
      // The template passed to buildPayloadFromTemplate should have name set
      const templateArg = (buildPayloadFromTemplate as ReturnType<typeof vi.fn>).mock.calls[0]![1];
      expect(templateArg.name).toBe('custom-name');
    });

    it('overrides displayName when provided', async () => {
      const params = { ...baseParams, displayName: 'Custom Display' };
      await buildClonePayload(mockClient as any, params);
      const templateArg = (buildPayloadFromTemplate as ReturnType<typeof vi.fn>).mock.calls[0]![1];
      expect(templateArg.display_name).toBe('Custom Display');
    });

    it('sets state to created by default', async () => {
      await buildClonePayload(mockClient as any, baseParams);
      const templateArg = (buildPayloadFromTemplate as ReturnType<typeof vi.fn>).mock.calls[0]![1];
      expect(templateArg.state).toBe('created');
    });

    it('sets state when provided', async () => {
      const params = { ...baseParams, state: 'running' };
      await buildClonePayload(mockClient as any, params);
      const templateArg = (buildPayloadFromTemplate as ReturnType<typeof vi.fn>).mock.calls[0]![1];
      expect(templateArg.state).toBe('running');
    });

    it('passes apiKey for screenshots when experiment has screenshots', async () => {
      mockClient.getExperiment.mockResolvedValue({
        name: 'Source',
        variant_screenshots: [{ url: 'img.png' }],
      });
      const params = { ...baseParams, apiKey: 'secret-key' };
      await buildClonePayload(mockClient as any, params);
      expect(experimentToMarkdown).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ apiKey: 'secret-key', screenshotsDir: '.screenshots' }),
      );
    });
  });

  describe('cloneExperiment', () => {
    it('creates experiment and returns result', async () => {
      const result = await cloneExperiment(mockClient as any, { name: 'New' }, id(1));
      expect(mockClient.createExperiment).toHaveBeenCalledWith({ name: 'New' });
      expect(result.data).toEqual({
        sourceId: id(1),
        id: 200,
        name: 'Cloned',
        type: 'experiment',
      });
    });
  });
});
