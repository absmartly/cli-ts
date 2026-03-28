import { describe, it, expect, afterEach } from 'vitest';
import { startCallbackServer, type CallbackServer } from './callback-server.js';

describe('startCallbackServer', () => {
  let server: CallbackServer | undefined;

  afterEach(async () => {
    if (server) {
      server.close();
      server = undefined;
    }
  });

  it('starts a server and returns port and redirectUri', async () => {
    server = await startCallbackServer();
    expect(server.port).toBeGreaterThan(0);
    expect(server.redirectUri).toBe(`http://localhost:${server.port}/oauth/callback`);
  });

  it('resolves with authorization code on callback', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(5000);

    const response = await fetch(`http://localhost:${server.port}/oauth/callback?code=test-auth-code`);
    expect(response.ok).toBe(true);

    const code = await codePromise;
    expect(code).toBe('test-auth-code');
  });

  it('returns an HTML success page on callback', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(5000);

    const response = await fetch(`http://localhost:${server.port}/oauth/callback?code=test-code`);
    const body = await response.text();
    expect(body).toContain('Authentication successful');

    await codePromise;
  });

  it('rejects if no code parameter in callback', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(5000);

    await fetch(`http://localhost:${server.port}/oauth/callback`);

    await expect(codePromise).rejects.toThrow('No authorization code');
  });

  it('rejects on timeout', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(100);

    await expect(codePromise).rejects.toThrow('timed out');
  });

  it('tries preferred ports first', async () => {
    server = await startCallbackServer([0]);
    expect(server.port).toBeGreaterThan(0);
  });
});
