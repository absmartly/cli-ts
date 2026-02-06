import { describe, it, expect } from 'vitest';
import { createAPIClient } from './client.js';

describe('APIClient - Admin Resources', () => {
  const client = createAPIClient('https://api.absmartly.com/v1', 'test-api-key');

  describe('Roles', () => {
    it('should list roles', async () => {
      const roles = await client.listRoles();
      expect(roles).toBeDefined();
      expect(Array.isArray(roles)).toBe(true);
    });

    it('should get role', async () => {
      const role = await client.getRole(1);
      expect(role).toBeDefined();
      expect(role.id).toBe(1);
    });

    it('should create role', async () => {
      const role = await client.createRole({ name: 'Custom Role', description: 'Test' });
      expect(role).toBeDefined();
    });

    it('should update role', async () => {
      const role = await client.updateRole(1, { description: 'Updated' });
      expect(role).toBeDefined();
    });

    it('should delete role', async () => {
      await expect(client.deleteRole(1)).resolves.not.toThrow();
    });
  });

  describe('Permissions', () => {
    it('should list permissions', async () => {
      const permissions = await client.listPermissions();
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
    });

    it('should list permission categories', async () => {
      const categories = await client.listPermissionCategories();
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('API Keys', () => {
    it('should list API keys', async () => {
      const keys = await client.listApiKeys(10);
      expect(keys).toBeDefined();
      expect(Array.isArray(keys)).toBe(true);
    });

    it('should get API key', async () => {
      const key = await client.getApiKey(1);
      expect(key).toBeDefined();
    });

    it('should create API key', async () => {
      const key = await client.createApiKey({ name: 'Test Key', permissions: 'read' });
      expect(key).toBeDefined();
      expect(key.key).toBeDefined();
    });

    it('should update API key', async () => {
      const key = await client.updateApiKey(1, { description: 'Updated' });
      expect(key).toBeDefined();
    });

    it('should delete API key', async () => {
      await expect(client.deleteApiKey(1)).resolves.not.toThrow();
    });
  });

  describe('Webhooks', () => {
    it('should list webhooks', async () => {
      const webhooks = await client.listWebhooks(10);
      expect(webhooks).toBeDefined();
      expect(Array.isArray(webhooks)).toBe(true);
    });

    it('should get webhook', async () => {
      const webhook = await client.getWebhook(1);
      expect(webhook).toBeDefined();
    });

    it('should create webhook', async () => {
      const webhook = await client.createWebhook({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
      });
      expect(webhook).toBeDefined();
    });

    it('should update webhook', async () => {
      const webhook = await client.updateWebhook(1, { enabled: false });
      expect(webhook).toBeDefined();
    });

    it('should delete webhook', async () => {
      await expect(client.deleteWebhook(1)).resolves.not.toThrow();
    });
  });
});
