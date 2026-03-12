import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('experiments list command integration', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  describe('pagination logic', () => {
    it('should calculate offset from page number correctly', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      const limit = 20;
      const page = 3;
      const expectedOffset = (page - 1) * limit;

      await client.listExperiments({ limit, offset: expectedOffset });

      expect(receivedParams?.get('limit')).toBe('20');
      expect(receivedParams?.get('offset')).toBe('40');
    });

    it('should handle page 1 with offset 0 (offset IS sent even when 0)', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      const limit = 10;
      const page = 1;
      const offset = (page - 1) * limit;

      await client.listExperiments({ limit, offset });

      expect(receivedParams?.get('offset')).toBe('0');
      expect(receivedParams?.get('limit')).toBe('10');
    });

    it('should handle large page numbers', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      const limit = 50;
      const page = 100;
      const offset = (page - 1) * limit;

      await client.listExperiments({ limit, offset });

      expect(receivedParams?.get('offset')).toBe('4950');
    });
  });

  describe('date filter integration', () => {
    it('should convert date strings to timestamps correctly', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({
        created_after: 1704067200000,
        created_before: 1735603200000,
      });

      expect(receivedParams?.get('created_at')).toBe('1704067200000,1735603200000');
    });

    it('should handle all three date range types', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({
        created_after: 1704067200000,
        created_before: 1706745600000,
        started_after: 1707350400000,
        started_before: 1709942400000,
        stopped_after: 1710547200000,
        stopped_before: 1713225600000,
      });

      expect(receivedParams?.get('created_at')).toBe('1704067200000,1706745600000');
      expect(receivedParams?.get('started_at')).toBe('1707350400000,1709942400000');
      expect(receivedParams?.get('stopped_at')).toBe('1710547200000,1713225600000');
    });
  });

  describe('filter combinations', () => {
    it('should combine state, type, and application filters', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({
        state: 'running',
        type: 'test',
        application: 'website',
      });

      expect(receivedParams?.get('state')).toBe('running');
      expect(receivedParams?.get('type')).toBe('test');
      expect(receivedParams?.get('application')).toBe('website');
    });

    it('should combine team and owner filters', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({
        teams: '1,2,3',
        owners: '10,20',
        tags: '5,15,25',
      });

      expect(receivedParams?.get('teams')).toBe('1,2,3');
      expect(receivedParams?.get('owners')).toBe('10,20');
      expect(receivedParams?.get('tags')).toBe('5,15,25');
    });

    it('should combine search with other filters', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({
        search: 'homepage',
        state: 'running',
        limit: 50,
      });

      expect(receivedParams?.get('search')).toBe('homepage');
      expect(receivedParams?.get('state')).toBe('running');
      expect(receivedParams?.get('limit')).toBe('50');
    });
  });

  describe('response handling', () => {
    it('should return empty array when no experiments', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ experiments: [] });
        })
      );

      const result = await client.listExperiments();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return experiments with correct structure', async () => {
      const mockExperiments = [
        {
          id: 1,
          name: 'test_1',
          display_name: 'Test 1',
          state: 'running',
          type: 'test',
        },
        {
          id: 2,
          name: 'test_2',
          display_name: 'Test 2',
          state: 'stopped',
          type: 'feature',
        },
      ];

      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ experiments: mockExperiments });
        })
      );

      const result = await client.listExperiments({ limit: 2 });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('test_1');
      expect(result[0].state).toBe('running');
      expect(result[1].id).toBe(2);
      expect(result[1].type).toBe('feature');
    });

    it('should respect limit in response', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const experiments = Array.from({ length: limit }, (_, i) => ({
            id: i + 1,
            name: `exp_${i + 1}`,
            state: 'created',
          }));
          return HttpResponse.json({ experiments });
        })
      );

      const result = await client.listExperiments({ limit: 5 });

      expect(result).toHaveLength(5);
    });
  });

  describe('search experiments', () => {
    it('should search with correct query parameter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.searchExperiments('homepage test', 25);

      expect(receivedParams?.get('search')).toBe('homepage test');
      expect(receivedParams?.get('limit')).toBe('25');
    });

    it('should use default limit for search', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.searchExperiments('test');

      expect(receivedParams?.get('search')).toBe('test');
      expect(receivedParams?.get('limit')).toBe('50');
    });
  });

  describe('alert and analysis filters', () => {
    it('should pass alert-srm filter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ alert_srm: 1 });
      expect(receivedParams?.get('sample_ratio_mismatch')).toBe('1');
    });

    it('should pass alert-cleanup-needed filter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ alert_cleanup_needed: 1 });
      expect(receivedParams?.get('cleanup_needed')).toBe('1');
    });

    it('should pass alert-audience-mismatch filter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ alert_audience_mismatch: 1 });
      expect(receivedParams?.get('audience_mismatch')).toBe('1');
    });

    it('should pass alert-sample-size-reached filter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ alert_sample_size_reached: 1 });
      expect(receivedParams?.get('sample_size_reached')).toBe('1');
    });

    it('should pass all remaining alert filters', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({
        alert_experiments_interact: 1,
        alert_group_sequential_updated: 1,
        alert_assignment_conflict: 1,
        alert_metric_threshold_reached: 1,
      });

      expect(receivedParams?.get('experiments_interact')).toBe('1');
      expect(receivedParams?.get('group_sequential_updated')).toBe('1');
      expect(receivedParams?.get('assignment_conflict')).toBe('1');
      expect(receivedParams?.get('metric_threshold_reached')).toBe('1');
    });

    it('should pass analysis-type filter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ analysis_type: 'group_sequential' });
      expect(receivedParams?.get('analysis_type')).toBe('group_sequential');
    });

    it('should pass running-type filter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ running_type: 'full_on' });
      expect(receivedParams?.get('running_type')).toBe('full_on');
    });

    it('should pass significance filter', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [] });
        })
      );

      await client.listExperiments({ significance: 'positive' });
      expect(receivedParams?.get('significance')).toBe('positive');
    });
  });
});
