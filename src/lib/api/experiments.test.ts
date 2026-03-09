import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from './client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';
import { fetchLiveMetadata, buildExperimentData } from '../../test/helpers/live-helpers.js';
import type { ExperimentId } from './branded-types.js';

const BASE_URL = TEST_BASE_URL;

describe('APIClient - Experiments', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  let expId: ExperimentId;
  let expName: string;

  beforeAll(async () => {
    const meta = await fetchLiveMetadata(client);
    const data = buildExperimentData(meta);
    expName = data.name;
    const created = await client.createExperiment(data as any);
    expId = created.id as ExperimentId;
  });

  afterAll(async () => {
    if (!expId) return;
    try {
      await client.archiveExperiment(expId);
    } catch {}
  });

  describe('listExperiments', () => {
    it('should return an array of experiments with expected fields', async () => {
      const experiments = await client.listExperiments();
      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments.length).toBeGreaterThan(0);
      for (const exp of experiments) {
        expect(exp).toHaveProperty('id');
        expect(typeof exp.id).toBe('number');
        expect(exp).toHaveProperty('name');
        expect(exp).toHaveProperty('state');
        expect(exp).toHaveProperty('type');
      }
    });

    it.skipIf(isLiveMode)('should pass query params to the API', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ limit: 10, state: 'running' });

      expect(receivedParams!.get('limit')).toBe('10');
      expect(receivedParams!.get('state')).toBe('running');
    });

    it.skipIf(isLiveMode)('should search by name via searchExperiments', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({
            experiments: [
              { id: 1, name: 'test_one', state: 'running' },
              { id: 2, name: 'test_two', state: 'stopped' },
            ],
          });
        })
      );

      const experiments = await client.searchExperiments('test', 5);

      expect(receivedParams!.get('search')).toBe('test');
      expect(receivedParams!.get('limit')).toBe('5');
      expect(experiments).toHaveLength(2);
      expect(experiments[0].name).toBe('test_one');
    });
  });

  describe('getExperiment', () => {
    it('should extract the experiment from the wrapped response', async () => {
      const experiment = await client.getExperiment(expId);
      expect(experiment.id).toBe(expId);
      expect(experiment).toHaveProperty('name');
      expect(experiment).toHaveProperty('state');
    });
  });

  describe('createExperiment', () => {
    it('should have returned an experiment with id and matching name', async () => {
      expect(expId).toBeDefined();
      expect(typeof expId).toBe('number');
      const created = await client.getExperiment(expId);
      expect(created.id).toBe(expId);
      expect(created).toHaveProperty('name');
    });
  });

  describe('updateExperiment', () => {
    it('should send update data and extract experiment from response', async () => {
      const data = { display_name: 'Updated Name' };
      const experiment = await client.updateExperiment(expId, data);
      expect(experiment.id).toBe(expId);
      expect(experiment).toHaveProperty('display_name');
      if (isLiveMode) expect(experiment.display_name).toBe('Updated Name');
    });

    it.runIf(isLiveMode)('should transition experiment to ready state', async () => {
      const experiment = await client.updateExperiment(expId, { state: 'ready' } as any);
      expect(experiment.id).toBe(expId);
      expect(experiment.state).toBe('ready');
    });
  });

  describe('developmentExperiment', () => {
    it('should return experiment in development state', async () => {
      const experiment = await client.developmentExperiment(expId, 'prepare for start');
      expect(experiment.id).toBe(expId);
      expect(experiment.state).toBe('development');
    });
  });

  describe('startExperiment', () => {
    it('should return experiment with running state', async () => {
      const experiment = await client.startExperiment(expId);
      expect(experiment.id).toBe(expId);
      expect(experiment.state).toBe('running');
    });
  });

  describe('stopExperiment', () => {
    it('should return experiment with stopped state', async () => {
      const experiment = await client.stopExperiment(expId, 'other');
      expect(experiment.id).toBe(expId);
      expect(experiment.state).toBe('stopped');
    });
  });

  describe.skipIf(isLiveMode)('archiveExperiment', () => {
    it('should send PUT with archive body', async () => {
      let receivedBody: Record<string, unknown> | null = null;
      server.use(
        http.put(`${BASE_URL}/experiments/:id/archive`, async ({ request }) => {
          receivedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ok: true, errors: [] });
        })
      );

      await client.archiveExperiment(123 as any);
      expect(receivedBody).toEqual({ archive: true });
    });
  });

  describe('listExperimentActivity', () => {
    it('should return activity notes', async () => {
      const notes = await client.listExperimentActivity(expId);
      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeGreaterThan(0);
    });
  });

  describe.skipIf(isLiveMode)('createExperimentNote', () => {
    it('should POST to activity endpoint and return unwrapped note', async () => {
      let receivedBody: Record<string, unknown> | null = null;
      let receivedUrl = '';
      server.use(
        http.post(`${BASE_URL}/experiments/:id/activity`, async ({ request, params }) => {
          receivedUrl = `/experiments/${params.id}/activity`;
          receivedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            ok: true,
            experiment_note: { id: 999, experiment_id: 42, note: 'Hello!', action: 'comment' },
            errors: [],
          });
        })
      );

      const note = await client.createExperimentNote(42 as any, 'Hello!');

      expect(receivedUrl).toBe('/experiments/42/activity');
      expect(receivedBody).toEqual({ note: 'Hello!' });
      expect(note.id).toBe(999);
      expect(note).toHaveProperty('action', 'comment');
      expect(note).not.toHaveProperty('ok');
    });
  });
});
