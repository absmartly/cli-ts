import { describe, it, expect } from 'vitest';
import { generatePKCE } from './pkce.js';

describe('generatePKCE', () => {
  it('returns a code verifier and challenge', () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();
  });

  it('generates a code verifier between 43 and 128 characters', () => {
    const { codeVerifier } = generatePKCE();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeVerifier.length).toBeLessThanOrEqual(128);
  });

  it('generates a code verifier using only unreserved characters', () => {
    const { codeVerifier } = generatePKCE();
    expect(codeVerifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('generates a base64url-encoded challenge', () => {
    const { codeChallenge } = generatePKCE();
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codeChallenge).not.toContain('=');
  });

  it('generates different values each call', () => {
    const a = generatePKCE();
    const b = generatePKCE();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });
});
