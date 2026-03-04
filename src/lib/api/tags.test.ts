import { describe, it, expect, afterEach } from 'vitest';
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
      const tags = await client.listExperimentTags(10);
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should get experiment tag by id', async () => {
      const tags = await client.listExperimentTags(1);
      const tagId = tags[0].id;
      const tag = await client.getExperimentTag(tagId);
      expect(tag).toBeDefined();
      expect(tag.id).toBe(tagId);
    });

    it('should create experiment tag and return unwrapped entity', async () => {
      const tag = await client.createExperimentTag({ tag: 'homepage' });
      expect(tag).toBeDefined();
      expect(tag.tag).toBe('homepage');
      expect(tag.id).toBeDefined();
    });
  });

  describe('Goal Tags', () => {
    it('should list goal tags', async () => {
      const tags = await client.listGoalTags(10);
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should get goal tag by id', async () => {
      const tags = await client.listGoalTags(1);
      const tagId = tags[0].id;
      const tag = await client.getGoalTag(tagId);
      expect(tag).toBeDefined();
      expect(tag.id).toBe(tagId);
    });

    it('should create goal tag and return unwrapped entity', async () => {
      const tag = await client.createGoalTag({ tag: 'conversion' });
      expect(tag).toBeDefined();
      expect(tag.tag).toBe('conversion');
    });
  });

  describe('Metric Tags', () => {
    it('should list metric tags', async () => {
      const tags = await client.listMetricTags(10);
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should get metric tag by id', async () => {
      const tags = await client.listMetricTags(1);
      const tagId = tags[0].id;
      const tag = await client.getMetricTag(tagId);
      expect(tag).toBeDefined();
      expect(tag.id).toBe(tagId);
    });
  });

  describe('Metric Categories', () => {
    it('should list metric categories', async () => {
      const categories = await client.listMetricCategories(10);
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should get metric category by id', async () => {
      const categories = await client.listMetricCategories(1);
      const catId = categories[0].id;
      const category = await client.getMetricCategory(catId);
      expect(category).toBeDefined();
      expect(category.id).toBe(catId);
    });

    it('should create metric category and return unwrapped entity', async () => {
      const category = await client.createMetricCategory({
        name: 'engagement',
        color: '#FF0000'
      });
      expect(category).toBeDefined();
      expect(category.name).toBe('engagement');
    });

    it('should archive metric category', async () => {
      const categories = await client.listMetricCategories(1);
      const catId = categories[0].id;
      await expect(client.archiveMetricCategory(catId)).resolves.not.toThrow();
    });
  });
});
