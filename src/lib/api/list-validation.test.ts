import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from './client.js';
import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

vi.mock('axios');
vi.mock('axios-retry');

describe('API List Response Validation', () => {
  let mockAxiosInstance: Partial<AxiosInstance>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      } as any,
    };
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as AxiosInstance);
    vi.mocked(axiosRetry).mockImplementation(() => {});
  });

  it('should throw error when response is not an object', async () => {
    vi.mocked(mockAxiosInstance.get!).mockResolvedValue({ data: 'invalid' });

    const client = new APIClient('https://api.example.com', 'test-key');

    await expect(client.listExperiments()).rejects.toThrow(
      'Invalid API response for listExperiments: Expected object, got string'
    );
  });

  it('should throw error when expected key is missing', async () => {
    vi.mocked(mockAxiosInstance.get!).mockResolvedValue({ data: { wrong_key: [] } });

    const client = new APIClient('https://api.example.com', 'test-key');

    await expect(client.listExperiments()).rejects.toThrow(
      'Invalid API response for listExperiments: Missing "experiments" field'
    );
  });

  it('should throw error when expected key is not an array', async () => {
    vi.mocked(mockAxiosInstance.get!).mockResolvedValue({ data: { experiments: 'not-array' } });

    const client = new APIClient('https://api.example.com', 'test-key');

    await expect(client.listExperiments()).rejects.toThrow(
      'Invalid API response for listExperiments: "experiments" must be an array, got string'
    );
  });

  it('should return valid array when response is correct', async () => {
    const mockData = [{ id: 1, name: 'Test' }];
    vi.mocked(mockAxiosInstance.get!).mockResolvedValue({ data: { experiments: mockData } });

    const client = new APIClient('https://api.example.com', 'test-key');

    const result = await client.listExperiments();
    expect(result).toEqual(mockData);
  });

  it('should validate listGoals responses', async () => {
    vi.mocked(mockAxiosInstance.get!).mockResolvedValue({ data: { wrong_key: [] } });

    const client = new APIClient('https://api.example.com', 'test-key');

    await expect(client.listGoals()).rejects.toThrow(
      'Invalid API response for listGoals: Missing "goals" field'
    );
  });

  it('should validate listSegments responses', async () => {
    vi.mocked(mockAxiosInstance.get!).mockResolvedValue({ data: { segments: 'not-array' } });

    const client = new APIClient('https://api.example.com', 'test-key');

    await expect(client.listSegments()).rejects.toThrow(
      'Invalid API response for listSegments: "segments" must be an array, got string'
    );
  });
});
