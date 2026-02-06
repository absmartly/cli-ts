import { describe, it, expect } from 'vitest';
import { createAPIClient } from './client.js';

describe('APIClient - Experiments', () => {
  const client = createAPIClient('https://api.absmartly.com/v1', 'test-api-key');

  describe('listExperiments', () => {
    it('should fetch experiments with limit', async () => {
      const experiments = await client.listExperiments({ limit: 10 });
      expect(experiments).toBeDefined();
      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments.length).toBe(10);
    });

    it('should filter by state', async () => {
      const experiments = await client.listExperiments({ state: 'running' });
      expect(experiments).toBeDefined();
    });

    it('should filter by type', async () => {
      const experiments = await client.listExperiments({ type: 'test' });
      expect(experiments).toBeDefined();
    });

    it('should search by name', async () => {
      const experiments = await client.searchExperiments('test', 5);
      expect(experiments).toBeDefined();
      expect(experiments.length).toBe(5);
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
      expect(experiment.id).toBeDefined();
    });
  });

  describe('updateExperiment', () => {
    it('should update an experiment', async () => {
      const data = { display_name: 'Updated Name' };
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

  describe('startExperiment', () => {
    it('should start an experiment', async () => {
      const experiment = await client.startExperiment(123);
      expect(experiment).toBeDefined();
      expect(experiment.state).toBe('running');
    });
  });

  describe('stopExperiment', () => {
    it('should stop an experiment', async () => {
      const experiment = await client.stopExperiment(123);
      expect(experiment).toBeDefined();
      expect(experiment.state).toBe('stopped');
    });
  });

  describe('archiveExperiment', () => {
    it('should archive an experiment', async () => {
      const experiment = await client.archiveExperiment(123);
      expect(experiment).toBeDefined();
      expect(experiment.state).toBe('archived');
    });
  });

  describe('experiment alerts', () => {
    it('should list alerts', async () => {
      const alerts = await client.listExperimentAlerts(123);
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should delete all alerts', async () => {
      await expect(client.deleteExperimentAlerts(123)).resolves.not.toThrow();
    });
  });

  describe('experiment notes', () => {
    it('should list notes', async () => {
      const notes = await client.listExperimentNotes(123);
      expect(notes).toBeDefined();
      expect(Array.isArray(notes)).toBe(true);
    });

    it('should create a note', async () => {
      const note = await client.createExperimentNote(123, 'Test note');
      expect(note).toBeDefined();
      expect(note.text).toBe('Test note');
    });
  });
});
