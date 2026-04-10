import { beforeAll, afterEach, afterAll } from 'vitest';
import { isLiveMode } from './helpers/test-config.js';
import { setTTYOverride } from '../lib/utils/stdin.js';

setTTYOverride({ stdin: true, stdout: true });

if (isLiveMode) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else {
  const { server } = await import('./mocks/server.js');
  beforeAll(() => {
    server.listen({
      onUnhandledRequest(request, print) {
        const url = new URL(request.url);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return;
        }
        print.error();
      },
    });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });
}
