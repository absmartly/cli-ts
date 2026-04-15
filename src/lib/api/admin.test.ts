import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from './client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe('APIClient - Admin Resources', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Roles', () => {
    it('should list roles as an array', async () => {
      const roles = await client.listRoles();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
    });

    it('should get role and extract from wrapped response', async () => {
      const roles = await client.listRoles();
      const roleId = roles[0].id;
      const role = await client.getRole(roleId);
      expect(role.id).toBe(roleId);
      expect(role).toHaveProperty('name');
      expect(role).not.toHaveProperty('role');
    });

    it('should create role and return unwrapped entity', async () => {
      const role = await client.createRole({
        name: `Custom Role ${Date.now()}`,
        description: 'Test',
        permissions: [],
        access_control_policies: [],
      });
      expect(role.id).toBeDefined();
      expect(role).toHaveProperty('name');
      expect(role).not.toHaveProperty('ok');
    });

    it.skipIf(isLiveMode)('should update role and return unwrapped entity', async () => {
      server.use(
        http.put(`${BASE_URL}/roles/:id`, async ({ params, request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          const data = (body as any).data || body;
          return HttpResponse.json({
            ok: true,
            role: { id: Number(params.id), ...data },
            errors: [],
          });
        })
      );
      const role = await client.updateRole(1, { description: 'Updated' });
      expect(role.id).toBe(1);
      expect(role.description).toBe('Updated');
      expect(role).not.toHaveProperty('ok');
    });

    it.skipIf(isLiveMode)('should delete role', async () => {
      let deletedId: string | null = null;
      server.use(
        http.delete(`${BASE_URL}/roles/:id`, ({ params }) => {
          deletedId = params.id as string;
          return new HttpResponse(null, { status: 204 });
        })
      );
      await client.deleteRole(1);
      expect(deletedId).toBe('1');
    });
  });

  describe('Permissions', () => {
    it('should list permissions as an array', async () => {
      const permissions = await client.listPermissions();
      expect(Array.isArray(permissions)).toBe(true);
    });

    it('should list permission categories as an array', async () => {
      const categories = await client.listPermissionCategories();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('API Keys', () => {
    it('should list API keys with expected fields', async () => {
      const keys = await client.listApiKeys({ items: 10 });
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0]).toHaveProperty('id');
    });

    it('should get API key and extract from wrapped response', async () => {
      const keys = await client.listApiKeys({ items: 1 });
      const keyId = keys[0].id;
      const key = await client.getApiKey(keyId);
      expect(key.id).toBe(keyId);
      expect(key).not.toHaveProperty('api_key');
    });

    it('should create API key and return unwrapped entity', async () => {
      const key = await client.createApiKey({
        name: `Test Key ${Date.now()}`,
        permissions: 'read',
      });
      expect(key.id).toBeDefined();
      expect(key).toHaveProperty('name');
      expect(key).not.toHaveProperty('ok');
    });

    it.skipIf(isLiveMode)('should update API key and return unwrapped entity', async () => {
      server.use(
        http.put(`${BASE_URL}/api_keys/:id`, async ({ params, request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          const data = (body as any).data || body;
          return HttpResponse.json({
            ok: true,
            api_key: { id: Number(params.id), ...data },
            errors: [],
          });
        })
      );
      const key = await client.updateApiKey(1, { description: 'Updated' });
      expect(key.id).toBe(1);
      expect(key.description).toBe('Updated');
      expect(key).not.toHaveProperty('ok');
    });

    it.skipIf(isLiveMode)('should delete API key', async () => {
      let deletedId: string | null = null;
      server.use(
        http.delete(`${BASE_URL}/api_keys/:id`, ({ params }) => {
          deletedId = params.id as string;
          return new HttpResponse(null, { status: 204 });
        })
      );
      await client.deleteApiKey(1);
      expect(deletedId).toBe('1');
    });
  });

  describe('Webhooks', () => {
    let webhookId: number;

    beforeAll(async () => {
      const webhook = await client.createWebhook({
        name: `Test Webhook ${Date.now()}`,
        description: 'Vitest webhook',
        url: 'https://example.com/webhook',
        events: [],
      });
      webhookId = webhook.id;
    });

    it('should list webhooks with expected fields', async () => {
      const webhooks = await client.listWebhooks({ items: 10 });
      expect(Array.isArray(webhooks)).toBe(true);
      expect(webhooks.length).toBeGreaterThan(0);
      expect(webhooks[0]).toHaveProperty('id');
    });

    it('should get webhook and extract from wrapped response', async () => {
      const webhook = await client.getWebhook(webhookId);
      expect(webhook.id).toBe(webhookId);
      expect(webhook).not.toHaveProperty('webhook');
    });

    it('should create webhook and return unwrapped entity', async () => {
      const webhook = await client.createWebhook({
        name: `Test Webhook Create ${Date.now()}`,
        description: 'Vitest webhook create test',
        url: 'https://example.com/webhook',
        events: [],
      });
      expect(webhook.id).toBeDefined();
      expect(webhook).toHaveProperty('name');
      expect(webhook).not.toHaveProperty('ok');
    });

    it.skipIf(isLiveMode)('should update webhook and return unwrapped entity', async () => {
      server.use(
        http.put(`${BASE_URL}/webhooks/:id`, async ({ params, request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          const data = (body as any).data || body;
          return HttpResponse.json({
            ok: true,
            webhook: { id: Number(params.id), ...data },
            errors: [],
          });
        })
      );
      const webhook = await client.updateWebhook(1, { enabled: false });
      expect(webhook.id).toBe(1);
      expect(webhook).not.toHaveProperty('ok');
    });

    it.skipIf(isLiveMode)('should delete webhook', async () => {
      let deletedId: string | null = null;
      server.use(
        http.delete(`${BASE_URL}/webhooks/:id`, ({ params }) => {
          deletedId = params.id as string;
          return new HttpResponse(null, { status: 204 });
        })
      );
      await client.deleteWebhook(1);
      expect(deletedId).toBe('1');
    });
  });
});
