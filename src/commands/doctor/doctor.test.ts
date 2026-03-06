import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doctorCommand } from './index.js';
import { loadConfig, getProfile } from '../../lib/config/config.js';
import { getAPIKey } from '../../lib/config/keyring.js';
import { createAPIClient } from '../../lib/api/client.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/config/config.js', () => ({
  loadConfig: vi.fn(),
  getProfile: vi.fn(),
}));
vi.mock('../../lib/config/keyring.js', () => ({
  getAPIKey: vi.fn(),
}));
vi.mock('../../lib/api/client.js', () => ({
  createAPIClient: vi.fn(),
}));

describe('doctor command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(doctorCommand);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should report all checks passed', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      'default-profile': 'default',
      profiles: {
        default: {
          api: { endpoint: 'https://api.example.com/v1' },
          expctld: { endpoint: 'https://ctl.example.com/v1' },
        },
      },
    });
    vi.mocked(getProfile).mockReturnValue({
      api: { endpoint: 'https://api.example.com/v1' },
      expctld: { endpoint: 'https://ctl.example.com/v1' },
      application: 'web',
      environment: 'production',
    });
    vi.mocked(getAPIKey).mockResolvedValue('test-key');
    vi.mocked(createAPIClient).mockReturnValue({
      listApplications: vi.fn().mockResolvedValue([]),
    } as any);

    await doctorCommand.parseAsync(['node', 'test']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('All checks passed');
  });

  it('should report missing API key', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      'default-profile': 'default',
      profiles: {
        default: {
          api: { endpoint: 'https://api.example.com/v1' },
          expctld: { endpoint: 'https://ctl.example.com/v1' },
        },
      },
    });
    vi.mocked(getProfile).mockReturnValue({
      api: { endpoint: 'https://api.example.com/v1' },
      expctld: { endpoint: 'https://ctl.example.com/v1' },
      application: 'web',
      environment: 'production',
    });
    vi.mocked(getAPIKey).mockResolvedValue(null);

    try {
      await doctorCommand.parseAsync(['node', 'test']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
    }

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('API key not found');
  });
});
