import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from '../../api-client/api-client.js';
import type { HttpClient, HttpRequestConfig, HttpResponse } from '../../api-client/http-client.js';

function createMockHttpClient(responseData: unknown): HttpClient {
  return {
    request: vi.fn<(config: HttpRequestConfig) => Promise<HttpResponse>>().mockResolvedValue({
      status: 200,
      data: responseData,
      headers: {},
    }),
  };
}

describe('API List Response Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when response is not an object', async () => {
    const client = new APIClient(createMockHttpClient('invalid'));

    await expect(client.listExperiments()).rejects.toThrow(
      'Invalid API response for listExperiments: Expected object, got string'
    );
  });

  it('should throw error when expected key is missing', async () => {
    const client = new APIClient(createMockHttpClient({ wrong_key: [] }));

    await expect(client.listExperiments()).rejects.toThrow(
      'Invalid API response for listExperiments: Missing "experiments" field'
    );
  });

  it('should throw error when expected key is not an array', async () => {
    const client = new APIClient(createMockHttpClient({ experiments: 'not-array' }));

    await expect(client.listExperiments()).rejects.toThrow(
      'Invalid API response for listExperiments: "experiments" must be an array, got string'
    );
  });

  it('should return valid array when response is correct', async () => {
    const mockData = [{ id: 1, name: 'Test' }];
    const client = new APIClient(createMockHttpClient({ experiments: mockData }));

    const result = await client.listExperiments();
    expect(result).toEqual(mockData);
  });

  it('should validate listGoals responses', async () => {
    const client = new APIClient(createMockHttpClient({ wrong_key: [] }));

    await expect(client.listGoals()).rejects.toThrow(
      'Invalid API response for listGoals: Missing "goals" field'
    );
  });

  it('should validate listSegments responses', async () => {
    const client = new APIClient(createMockHttpClient({ segments: 'not-array' }));

    await expect(client.listSegments()).rejects.toThrow(
      'Invalid API response for listSegments: "segments" must be an array, got string'
    );
  });
});
