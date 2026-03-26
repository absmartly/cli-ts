import { Command, Option } from 'commander';

interface OptionChoices {
  [optionFlag: string]: string[];
}

interface SubcommandInfo {
  name: string;
  description: string;
  options: string[];
  optionChoices: OptionChoices;
  subcommands: SubcommandInfo[];
  aliases: string[];
}

interface CommandTree {
  [name: string]: {
    description: string;
    aliases: string[];
    options: string[];
    optionChoices: OptionChoices;
    subcommands: SubcommandInfo[];
  };
}

function extractOptionChoices(cmd: Command): OptionChoices {
  const choices: OptionChoices = {};
  for (const opt of cmd.options) {
    if ((opt as Option & { argChoices?: string[] }).argChoices?.length) {
      if (opt.long) choices[opt.long] = (opt as Option & { argChoices: string[] }).argChoices;
    }
  }
  return choices;
}

function extractOptions(cmd: Command): string[] {
  const opts: string[] = [];
  for (const opt of cmd.options) {
    if (opt.long) opts.push(opt.long);
    if (opt.short) opts.push(opt.short);
  }
  return opts;
}

function buildSubcommandTree(cmd: Command): SubcommandInfo[] {
  const result: SubcommandInfo[] = [];
  for (const sub of cmd.commands) {
    result.push({
      name: sub.name(),
      description: sub.description() || sub.name(),
      aliases: sub.aliases(),
      options: extractOptions(sub),
      optionChoices: extractOptionChoices(sub),
      subcommands: buildSubcommandTree(sub),
    });
  }
  return result;
}

function buildCommandTree(program: Command): CommandTree {
  const tree: CommandTree = {};
  for (const cmd of program.commands) {
    tree[cmd.name()] = {
      description: cmd.description() || cmd.name(),
      aliases: cmd.aliases(),
      options: extractOptions(cmd),
      optionChoices: extractOptionChoices(cmd),
      subcommands: buildSubcommandTree(cmd),
    };
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

  let subcmdCases = '';
  for (const [name, entry] of Object.entries(tree)) {
    if (entry.subcommands.length === 0) continue;
    const subcmdNames = entry.subcommands.map(s => s.name).join(' ');
    const patterns = [name, ...entry.aliases].join('|');
    subcmdCases += `    ${patterns})\n`;
    subcmdCases += `      if [ "$COMP_CWORD" -eq 2 ]; then\n`;
    subcmdCases += `        COMPREPLY=($(compgen -W "${subcmdNames}" -- "$cur"))\n`;
    subcmdCases += `        return\n`;
    subcmdCases += `      fi\n`;

    for (const sub of entry.subcommands) {
      const subPatterns = [sub.name, ...sub.aliases].join('|');
      const subOpts = sub.options.join(' ');
      let subOptChoiceCases = '';
      for (const [flag, values] of Object.entries(sub.optionChoices)) {
        subOptChoiceCases += `          ${flag})\n`;
        subOptChoiceCases += `            COMPREPLY=($(compgen -W "${values.join(' ')}" -- "$cur"))\n`;
        subOptChoiceCases += `            return\n`;
        subOptChoiceCases += `            ;;\n`;
      }

      subcmdCases += `      case "\${COMP_WORDS[2]}" in\n`;
      subcmdCases += `        ${subPatterns})\n`;
      if (subOptChoiceCases) {
        subcmdCases += `          case "$prev" in\n`;
        subcmdCases += subOptChoiceCases;
        subcmdCases += `          esac\n`;
      }
      subcmdCases += `          if [[ "$cur" == -* ]]; then\n`;
      subcmdCases += `            COMPREPLY=($(compgen -W "${subOpts}" -- "$cur"))\n`;
      subcmdCases += `          fi\n`;
      subcmdCases += `          ;;\n`;
      subcmdCases += `      esac\n`;
    }
    subcmdCases += `      ;;\n`;
  }

  const globalOptsStr = globalOptions.join(' ');

  return `#!/usr/bin/env bash
# bash completion for abs (ABSmartly CLI)
# Add to ~/.bashrc: eval "$(abs completion bash)"

_abs_completions() {
  local cur prev
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  # Global options
  if [[ "$cur" == -* ]] && [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=($(compgen -W "${globalOptsStr}" -- "$cur"))
    return
  fi

  # Top-level commands
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=($(compgen -W "${allTopLevel}" -- "$cur"))
    return
  fi

  # Subcommands and options
  case "\${COMP_WORDS[1]}" in
${subcmdCases}  esac
}
complete -F _abs_completions abs
`;
}

function generateZshCompletion(tree: CommandTree, globalOptions: string[]): string {
  let commandEntries = '';
  for (const [name, entry] of Object.entries(tree)) {
    const desc = entry.description.split('\n')[0]!.replace(/'/g, "'\\''");
    commandEntries += `      '${name}:${desc}'\n`;
  }

  let subcommandCases = '';
  for (const [name, entry] of Object.entries(tree)) {
    if (entry.subcommands.length === 0) continue;
    const patterns = [name, ...entry.aliases].join('|');

    let subcmdEntries = '';
    for (const sub of entry.subcommands) {
      const desc = sub.description.split('\n')[0]!.replace(/'/g, "'\\''");
      subcmdEntries += `          '${sub.name}:${desc}'\n`;
    }

    let subsubCases = '';
    for (const sub of entry.subcommands) {
      const subPatterns = [sub.name, ...sub.aliases].join('|');
      const optSpecs: string[] = [];
      for (const opt of sub.options) {
        if (sub.optionChoices[opt]) {
          const vals = sub.optionChoices[opt]!.join(' ');
          optSpecs.push(`'${opt}[]:task:(${vals})'`);
        } else {
          optSpecs.push(`'${opt}'`);
        }
      }
      if (optSpecs.length > 0) {
        subsubCases += `          ${subPatterns})\n`;
        subsubCases += `            _arguments -s \\\n`;
        subsubCases += `              ${optSpecs.join(' \\\n              ')}\n`;
        subsubCases += `            ;;\n`;
      }
    }

    subcommandCases += `      ${patterns})\n`;
    subcommandCases += `        if (( CURRENT == 3 )); then\n`;
    subcommandCases += `          local -a subcmds=(\n`;
    subcommandCases += subcmdEntries;
    subcommandCases += `          )\n`;
    subcommandCases += `          _describe 'subcommand' subcmds\n`;
    if (subsubCases) {
      subcommandCases += `        else\n`;
      subcommandCases += `          case "$words[3]" in\n`;
      subcommandCases += subsubCases;
      subcommandCases += `          esac\n`;
    }
    subcommandCases += `        fi\n`;
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
  else
    case "$words[2]" in
${subcommandCases}    esac
  fi
}
_abs "$@"
`;
}

function extractGlobalOptions(program: Command): string[] {
  return extractOptions(program);
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
