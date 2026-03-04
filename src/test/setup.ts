import { beforeAll, afterEach, afterAll } from 'vitest';
import { isLiveMode } from './helpers/test-config.js';

if (isLiveMode) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else {
  const { server } = await import('./mocks/server.js');
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });
}
