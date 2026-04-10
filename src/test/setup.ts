import { beforeAll, afterEach, afterAll } from 'vitest';
import { isLiveMode } from './helpers/test-config.js';
import { setTTYOverride } from '../lib/utils/stdin.js';

setTTYOverride({ stdin: true, stdout: true });

if (isLiveMode) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else {
  const { server } = await import('./mocks/server.js');
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });
}
