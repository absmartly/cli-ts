import { Command } from 'commander';
import open from 'open';
import { getProfile, loadConfig } from '../../lib/config/config.js';

export const openCommand = new Command('open')
  .description('Open dashboard in browser')
  .argument('[resource]', 'resource to open (experiment, experiments, metrics, goals, teams, etc.)')
  .argument('[id]', 'resource ID')
  .action(async (resource?: string, id?: string) => {
    try {
      const config = loadConfig();
      const profile = getProfile(config['default-profile']);

      let webURL = profile.api.endpoint.replace(/\/v1$/, '');

      if (resource && id) {
        webURL += `/${resource}/${id}`;
      } else if (resource) {
        webURL += `/${resource}`;
      }

      await open(webURL);
      console.log(`Opening ${webURL}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
