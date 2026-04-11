import { spawn } from 'child_process';
import { getProfile, loadConfig } from '../../lib/config/config.js';
import { getAPIKey, getOAuthToken } from '../../lib/config/keyring.js';

const profileArg =
  process.argv.find((a) => a.startsWith('--profile=')) ??
  process.argv.find((a) => a === '--profile');
let profileName: string | undefined;

if (profileArg === '--profile') {
  const idx = process.argv.indexOf('--profile');
  profileName = process.argv[idx + 1];
} else if (profileArg) {
  profileName = profileArg.split('=')[1];
}

if (!profileName) {
  profileName = process.env.LIVE_PROFILE;
}

if (!profileName) {
  const config = loadConfig();
  profileName = config['default-profile'];
}

const profile = getProfile(profileName);
const endpoint = profile.api.endpoint;

if (!endpoint) {
  console.error(`No API endpoint configured for profile "${profileName}".`);
  process.exit(1);
}

const authMethod = profile.api['auth-method'] ?? 'api-key';

const env: Record<string, string> = {
  ...(process.env as Record<string, string>),
  USE_LIVE_API: '1',
  LIVE_API_URL: endpoint,
  LIVE_PROFILE: profileName!,
};

if (authMethod === 'oauth-jwt') {
  const token = await getOAuthToken(profileName);
  if (!token) {
    console.error(
      `No OAuth token found for profile "${profileName}". Run: abs auth login --profile ${profileName}`
    );
    process.exit(1);
  }
  env.LIVE_OAUTH_TOKEN = token;
} else {
  const apiKey = await getAPIKey(profileName);
  if (!apiKey) {
    console.error(
      `No API key found for profile "${profileName}". Run: abs auth login --profile ${profileName}`
    );
    process.exit(1);
  }
  env.LIVE_API_KEY = apiKey;
}

console.log(`Running vitest against ${endpoint} (profile: ${profileName}, auth: ${authMethod})\n`);

const child = spawn('bun', ['vitest', 'run'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
