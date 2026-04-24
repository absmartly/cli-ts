import { describe, it, expect } from 'vitest';
import { server } from '../../test/mocks/server.js';
import { errorHandlers } from '../../test/mocks/error-handlers.js';
import { createAPIClient } from './client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('APIClient - Validation and Error Scenarios', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  describe('Experiment Creation Validation', () => {
    beforeEach(() => {
      server.use(...errorHandlers);
    });

    it('should reject experiment creation without name', async () => {
      try {
        await client.createExperiment({});
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('name is required');
      }
    });

    it('should reject duplicate experiment names', async () => {
      try {
        await client.createExperiment({ name: 'duplicate_name' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(409);
        expect(error.response.message).toContain('already exists');
      }
    });

    it('should reject experiment without unit_type_id', async () => {
      try {
        await client.createExperiment({ name: 'test_experiment' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('unit_type_id is required');
      }
    });
  });

  describe('Experiment State Validation', () => {
    beforeEach(() => {
      server.use(...errorHandlers);
    });

    it('should reject starting already running experiment', async () => {
      try {
        await client.startExperiment(999);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('already running');
      }
    });

    it('should reject stopping non-running experiment', async () => {
      try {
        await client.stopExperiment(888, 'other');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('not running');
      }
    });
  });

  describe('Goal Validation', () => {
    beforeEach(() => {
      server.use(...errorHandlers);
    });

    it('should reject goal creation without name', async () => {
      try {
        await client.createGoal({});
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('name is required');
      }
    });

    it('should reject duplicate goal names', async () => {
      try {
        await client.createGoal({ name: 'duplicate' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(409);
        expect(error.response.message).toContain('already exists');
      }
    });
  });

  describe('Segment Validation', () => {
    beforeEach(() => {
      server.use(...errorHandlers);
    });

    it('should reject segment creation without name', async () => {
      try {
        await client.createSegment({});
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('name is required');
      }
    });

    it('should reject segment creation without value_source_attribute', async () => {
      try {
        await client.createSegment({ name: 'test' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('value_source_attribute is required');
      }
    });

    it('should reject deleting segment in use', async () => {
      try {
        await client.deleteSegment(666);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(409);
        expect(error.response.message).toContain('in use');
      }
    });
  });

  describe('API Key Validation', () => {
    beforeEach(() => {
      server.use(...errorHandlers);
    });

    it('should reject API key creation without name', async () => {
      try {
        await client.createApiKey({});
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response.message).toContain('name is required');
      }
    });

    it('should return generated API key on creation', async () => {
      const apiKey = await client.createApiKey({ name: 'Test Key' });

      expect(apiKey.key).toBeDefined();
      expect(apiKey.key).toMatch(/^abs_/);
      expect(apiKey.name).toBe('Test Key');
    });
  });
});
