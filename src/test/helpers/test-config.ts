export const isLiveMode = process.env.USE_LIVE_API === '1';

export const TEST_BASE_URL = isLiveMode
  ? process.env.LIVE_API_URL!
  : 'https://api.absmartly.com/v1';

export const TEST_API_KEY = isLiveMode
  ? process.env.LIVE_API_KEY!
  : 'test-api-key';
