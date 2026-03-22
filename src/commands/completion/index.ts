import { Command } from 'commander';

interface CommandTree {
  [name: string]: {
    description: string;
    aliases: string[];
    subcommands: { name: string; description: string }[];
    options: string[];
  };
}

function buildCommandTree(program: Command): CommandTree {
  const tree: CommandTree = {};

  for (const cmd of program.commands) {
    const name = cmd.name();
    const aliases = cmd.aliases();
    const description = cmd.description() || name;
    const subcommands: { name: string; description: string }[] = [];
    const options: string[] = [];

    for (const sub of cmd.commands) {
      subcommands.push({ name: sub.name(), description: sub.description() || sub.name() });
    }

    for (const opt of cmd.options) {
      if (opt.long) options.push(opt.long);
      if (opt.short) options.push(opt.short);
    }

    tree[name] = { description, aliases, subcommands, options };
  }

  return tree;
}

function generateBashCompletion(tree: CommandTree, globalOptions: string[]): string {
  const commandNames = Object.keys(tree);
  const allAliases: string[] = [];
  for (const entry of Object.values(tree)) {
    allAliases.push(...entry.aliases);
  }
  const allTopLevel = [...commandNames, ...allAliases].join(' ');

  let caseClauses = '';
  for (const [name, entry] of Object.entries(tree)) {
    if (entry.subcommands.length === 0) continue;
    const subcmdNames = entry.subcommands.map(s => s.name).join(' ');
    const patterns = [name, ...entry.aliases].join('|');
    caseClauses += `    ${patterns})\n`;
    caseClauses += `      if [ "$COMP_CWORD" -eq 2 ]; then\n`;
    caseClauses += `        COMPREPLY=($(compgen -W "${subcmdNames}" -- "$cur"))\n`;
    caseClauses += `      fi\n`;
    caseClauses += `      ;;\n`;
  }

  const globalOptsStr = globalOptions.join(' ');

  return `#!/usr/bin/env bash
# bash completion for abs (ABSmartly CLI)
# Add to ~/.bashrc: eval "$(abs completion bash)"

_abs_completions() {
  local cur prev commands
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  # Global options
  if [[ "$cur" == -* ]]; then
    COMPREPLY=($(compgen -W "${globalOptsStr}" -- "$cur"))
    return
  fi

  # Top-level commands
  if [ "$COMP_CWORD" -eq 1 ]; then
    commands="${allTopLevel}"
    COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    return
  fi

  # Subcommands based on parent
  case "\${COMP_WORDS[1]}" in
${caseClauses}  esac
}
complete -F _abs_completions abs
`;
}

function generateZshCompletion(tree: CommandTree, globalOptions: string[]): string {
  let commandEntries = '';
  for (const [name, entry] of Object.entries(tree)) {
    const desc = entry.description.replace(/'/g, "'\\''");
    commandEntries += `      '${name}:${desc}'\n`;
  }

  let subcommandCases = '';
  for (const [name, entry] of Object.entries(tree)) {
    if (entry.subcommands.length === 0) continue;
    const patterns = [name, ...entry.aliases].join('|');
    let subcmdEntries = '';
    for (const sub of entry.subcommands) {
      const desc = sub.description.replace(/'/g, "'\\''");
      subcmdEntries += `          '${sub.name}:${desc}'\n`;
    }
    subcommandCases += `      ${patterns})\n`;
    subcommandCases += `        local -a subcmds=(\n`;
    subcommandCases += subcmdEntries;
    subcommandCases += `        )\n`;
    subcommandCases += `        _describe 'subcommand' subcmds\n`;
    subcommandCases += `        ;;\n`;
  }

  const globalOptsStr = globalOptions.map(o => `'${o}'`).join(' ');

  return `#compdef abs
# zsh completion for abs (ABSmartly CLI)
# Add to ~/.zshrc: eval "$(abs completion zsh)"

_abs() {
  local -a commands global_options

  global_options=(${globalOptsStr})

  if (( CURRENT == 2 )); then
    if [[ "$words[2]" == -* ]]; then
      compadd -- $global_options
      return
    fi
    commands=(
${commandEntries}    )
    _describe 'command' commands
  elif (( CURRENT == 3 )); then
    case "$words[2]" in
${subcommandCases}    esac
  fi
}
_abs "$@"
`;
}

function extractGlobalOptions(program: Command): string[] {
  const opts: string[] = [];
  for (const opt of program.options) {
    if (opt.long) opts.push(opt.long);
    if (opt.short) opts.push(opt.short);
  }
  return opts;
}

export function createCompletionCommand(program: Command): Command {
  return new Command('completion')
    .description('Generate shell completion scripts')
    .argument('<shell>', 'shell type (bash or zsh)')
    .action((shell: string) => {
      const tree = buildCommandTree(program);
      const globalOptions = extractGlobalOptions(program);

      switch (shell) {
        case 'bash':
          console.log(generateBashCompletion(tree, globalOptions));
          break;
        case 'zsh':
          console.log(generateZshCompletion(tree, globalOptions));
          break;
        default:
          console.error(`Unsupported shell: ${shell}. Supported shells: bash, zsh`);
          process.exit(1);
      }

      process.exit(0);
    });
}

