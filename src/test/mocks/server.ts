import { isLiveMode } from '../helpers/test-config.js';

const noopServer = {
  listen: () => {},
  close: () => {},
  resetHandlers: () => {},
  use: () => {},
  listHandlers: () => [],
};

export const server = isLiveMode
  ? (noopServer as any)
  : (await import('absmartly-api-mocks/server')).createServer('https://api.absmartly.com/v1');
