import { Command } from 'commander';
import open from 'open';
import { getProfile, loadConfig } from '../../lib/config/config.js';
import { withErrorHandling } from '../../lib/utils/api-helper.js';

const VALID_RESOURCES = [
  'experiments', 'experiment', 'metrics', 'metric', 'goals', 'goal',
  'teams', 'team', 'users', 'user', 'segments', 'segment'
] as const;

export const openCommand = new Command('open')
  .description('Open dashboard in browser')
  .argument('[resource]', 'resource to open (experiment, experiments, metrics, goals, teams, etc.)')
  .argument('[id]', 'resource ID')
  .action(withErrorHandling(async (resource?: string, id?: string) => {
    const config = loadConfig();
    const profile = getProfile(config['default-profile']);

    let webURL = profile.api.endpoint.replace(/\/v1$/, '');

    if (resource) {
      if (!(VALID_RESOURCES as readonly string[]).includes(resource)) {
        throw new Error(
          `Invalid resource type: "${resource}"\nValid types: ${VALID_RESOURCES.join(', ')}`
        );
      }

      if (id) {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId) || numericId <= 0) {
          throw new Error(`Invalid resource ID: "${id}" - must be a positive integer`);
        }
        webURL += `/${resource}/${numericId}`;
      } else {
        webURL += `/${resource}`;
      }
    }

    await open(webURL);
    console.log(`Opening ${webURL}`);
  }));
