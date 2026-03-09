import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authCommand } from './index.js';
import * as config from '../../lib/config/config.js';
import * as keyring from '../../lib/config/keyring.js';

vi.mock('../../lib/config/config.js');
vi.mock('../../lib/config/keyring.js');

describe('auth status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API key display security', () => {
    beforeEach(() => {
      vi.mocked(config.loadConfig).mockReturnValue({
        'default-profile': 'default',
        profiles: {
          default: {
            api: { endpoint: 'https://api.example.com' },
            expctld: { endpoint: 'https://ctl.example.com' },
          },
        },
      });

      vi.mocked(config.getProfile).mockReturnValue({
        api: { endpoint: 'https://api.example.com' },
        expctld: { endpoint: 'https://ctl.example.com' },
      });
    });

    it('should hide API key by default', async () => {
      vi.mocked(keyring.getAPIKey).mockResolvedValue('sk-1234567890abcdef');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const statusCmd = authCommand.commands.find((cmd) => cmd.name() === 'status');
      await statusCmd?.parseAsync(['node', 'test'], { from: 'user' });

      expect(consoleSpy).toHaveBeenCalledWith('API Key: ***hidden***');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('1234'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('cdef'));

      consoleSpy.mockRestore();
    });

    it('should show last 4 characters with --show-key flag', async () => {
      vi.mocked(keyring.getAPIKey).mockResolvedValue('sk-1234567890abcdef');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const statusCmd = authCommand.commands.find((cmd) => cmd.name() === 'status');
      await statusCmd?.parseAsync(['node', 'test', '--show-key'], { from: 'user' });

      expect(consoleSpy).toHaveBeenCalledWith('API Key: ***cdef');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('1234'));

      consoleSpy.mockRestore();
    });

    it('should show "not set" when no API key exists', async () => {
      vi.mocked(keyring.getAPIKey).mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const statusCmd = authCommand.commands.find((cmd) => cmd.name() === 'status');
      await statusCmd?.parseAsync(['node', 'test'], { from: 'user' });

      expect(consoleSpy).toHaveBeenCalledWith('API Key: not set');

      consoleSpy.mockRestore();
    });
  });
});
