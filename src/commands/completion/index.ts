import { Command } from 'commander';

export const completionCommand = new Command('completion')
  .description('Generate shell completion scripts')
  .argument('<shell>', 'shell type (bash, zsh, fish, powershell)')
  .action((shell: string) => {
    console.log(`# Completion for ${shell}`);
    console.log('# Note: Commander.js does not have built-in completion generation.');
    console.log('# You can use tools like tabtab or implement custom completion logic.');
    console.log('#');
    console.log('# For now, you can add manual completions for the main commands:');
    console.log('# abs experiments list get search create update start stop archive delete');
    console.log('# abs auth login logout status');
    console.log('# abs config list get set unset');
    console.log('# abs goals teams users metrics segments apps envs units');
    process.exit(0);
  });
