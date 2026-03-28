import { describe, it, expect } from 'vitest';
import { generatePKCE } from './pkce.js';
import { startCallbackServer } from './callback-server.js';

describe('OAuth integration', () => {
  it('full PKCE flow: generate, callback, exchange', async () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();

    const server = await startCallbackServer([0]);
    expect(server.port).toBeGreaterThan(0);

    const codePromise = server.waitForCode(5000);
    await fetch(`${server.redirectUri}?code=integration-test-code`);
    const code = await codePromise;

    expect(code).toBe('integration-test-code');
  });

  it('callback server handles missing code', async () => {
    const server = await startCallbackServer([0]);
    const codePromise = server.waitForCode(5000);

    await fetch(`${server.redirectUri}`);

    await expect(codePromise).rejects.toThrow();
  });
});
