import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from './client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe('APIClient - Tags', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Experiment Tags', () => {
    it('should list experiment tags', async () => {
      const tags = await client.listExperimentTags({ items: 10 });
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should get experiment tag by id', async () => {
      const tags = await client.listExperimentTags({ items: 1 });
      const tagId = tags[0].id;
      const tag = await client.getExperimentTag(tagId);
      expect(tag).toBeDefined();
      expect(tag.id).toBe(tagId);
    });

    it('should create experiment tag and return unwrapped entity', async () => {
      const tagName = `exp_vitest_${Date.now()}`;
      const tag = await client.createExperimentTag({ tag: tagName });
      expect(tag).toBeDefined();
      expect(tag.tag).toBe(tagName);
      expect(tag.id).toBeDefined();
    });
  });

  describe('Goal Tags', () => {
    it('should list goal tags', async () => {
      const tags = await client.listGoalTags({ items: 10 });
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should get goal tag by id', async () => {
      const tags = await client.listGoalTags({ items: 1 });
      const tagId = tags[0].id;
      const tag = await client.getGoalTag(tagId);
      expect(tag).toBeDefined();
      expect(tag.id).toBe(tagId);
    });

    it('should create goal tag and return unwrapped entity', async () => {
      const tagName = `goal_vitest_${Date.now()}`;
      const tag = await client.createGoalTag({ tag: tagName });
      expect(tag).toBeDefined();
      expect(tag.tag).toBe(tagName);
    });
  });

  describe('Metric Tags', () => {
    let metricTagId: number;

    beforeAll(async () => {
      const tag = await client.createMetricTag({ tag: `metric_vitest_${Date.now()}` });
      metricTagId = tag.id;
    });

    it('should list metric tags', async () => {
      const tags = await client.listMetricTags({ items: 10 });
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should get metric tag by id', async () => {
      const tag = await client.getMetricTag(metricTagId);
      expect(tag).toBeDefined();
      expect(tag.id).toBe(metricTagId);
    });
  });

  describe('Metric Categories', () => {
    let catId: number;

    beforeAll(async () => {
      const category = await client.createMetricCategory({
        name: `engagement_${Date.now()}`,
        color: '#FF0000',
      });
      catId = category.id;
    });

    it('should list metric categories', async () => {
      const categories = await client.listMetricCategories({ items: 10 });
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should get metric category by id', async () => {
      const category = await client.getMetricCategory(catId);
      expect(category).toBeDefined();
      expect(category.id).toBe(catId);
    });

    it('should create metric category and return unwrapped entity', async () => {
      const category = await client.createMetricCategory({
        name: `category_${Date.now()}`,
        color: '#00FF00',
      });
      expect(category).toBeDefined();
      expect(category).toHaveProperty('name');
    });

    it('should archive metric category', async () => {
      await expect(client.archiveMetricCategory(catId)).resolves.not.toThrow();
    });
  });
});
