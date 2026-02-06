import { describe, it, expect } from 'vitest';
import { createAPIClient } from './client.js';

describe('APIClient - Tags', () => {
  const client = createAPIClient('https://api.absmartly.com/v1', 'test-api-key');

  describe('Experiment Tags', () => {
    it('should list experiment tags', async () => {
      const tags = await client.listExperimentTags(10);
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should get experiment tag', async () => {
      const tag = await client.getExperimentTag(123);
      expect(tag).toBeDefined();
    });

    it('should create experiment tag', async () => {
      const tag = await client.createExperimentTag({ tag: 'homepage' });
      expect(tag).toBeDefined();
    });

    it('should update experiment tag', async () => {
      const tag = await client.updateExperimentTag(123, { tag: 'updated' });
      expect(tag).toBeDefined();
    });

    it('should delete experiment tag', async () => {
      await expect(client.deleteExperimentTag(123)).resolves.not.toThrow();
    });
  });

  describe('Goal Tags', () => {
    it('should list goal tags', async () => {
      const tags = await client.listGoalTags(10);
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should get goal tag', async () => {
      const tag = await client.getGoalTag(123);
      expect(tag).toBeDefined();
    });

    it('should create goal tag', async () => {
      const tag = await client.createGoalTag({ tag: 'conversion' });
      expect(tag).toBeDefined();
    });
  });

  describe('Metric Tags', () => {
    it('should list metric tags', async () => {
      const tags = await client.listMetricTags(10);
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should get metric tag', async () => {
      const tag = await client.getMetricTag(123);
      expect(tag).toBeDefined();
    });
  });

  describe('Metric Categories', () => {
    it('should list metric categories', async () => {
      const categories = await client.listMetricCategories(10);
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should get metric category', async () => {
      const category = await client.getMetricCategory(123);
      expect(category).toBeDefined();
    });

    it('should create metric category', async () => {
      const category = await client.createMetricCategory({
        name: 'engagement',
        color: '#FF0000'
      });
      expect(category).toBeDefined();
    });

    it('should archive metric category', async () => {
      await expect(client.archiveMetricCategory(123)).resolves.not.toThrow();
    });
  });
});
