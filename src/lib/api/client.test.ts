import { describe, it, expect } from 'vitest';
import { createAPIClient } from './client.js';

describe('APIClient', () => {
  const client = createAPIClient('https://api.absmartly.com/v1', 'test-api-key');

  describe('listExperiments', () => {
    it('should fetch experiments', async () => {
      const experiments = await client.listExperiments({ limit: 10 });

      expect(experiments).toBeDefined();
      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments.length).toBe(10);
    });

    it('should handle empty results', async () => {
      const experiments = await client.listExperiments({ limit: 0 });

      expect(experiments).toBeDefined();
      expect(Array.isArray(experiments)).toBe(true);
    });
  });

  describe('getExperiment', () => {
    it('should fetch a single experiment', async () => {
      const experiment = await client.getExperiment(123);

      expect(experiment).toBeDefined();
      expect(experiment.id).toBe(123);
    });
  });

  describe('createExperiment', () => {
    it('should create an experiment', async () => {
      const data = {
        name: 'test_experiment',
        display_name: 'Test Experiment',
        type: 'test',
      };

      const experiment = await client.createExperiment(data);

      expect(experiment).toBeDefined();
      expect(experiment.name).toBe(data.name);
      expect(experiment.id).toBeDefined();
    });
  });

  describe('updateExperiment', () => {
    it('should update an experiment', async () => {
      const data = {
        display_name: 'Updated Name',
      };

      const experiment = await client.updateExperiment(123, data);

      expect(experiment).toBeDefined();
      expect(experiment.id).toBe(123);
    });
  });

  describe('deleteExperiment', () => {
    it('should delete an experiment', async () => {
      await expect(client.deleteExperiment(123)).resolves.not.toThrow();
    });
  });
});
