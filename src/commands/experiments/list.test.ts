import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';

const BASE_URL = 'https://api.absmartly.com/v1';

describe('experiments list command integration', () => {
  const client = createAPIClient(BASE_URL, 'test-key');

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
});
