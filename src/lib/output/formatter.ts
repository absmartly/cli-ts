import Table from 'cli-table3';
import yaml from 'js-yaml';
import chalk from 'chalk';

export type OutputFormat = 'table' | 'json' | 'yaml' | 'plain' | 'markdown' | 'template';

export interface OutputOptions {
  format?: OutputFormat;
  noColor?: boolean;
  full?: boolean;
  terse?: boolean;
}

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  truncate?: boolean;
}

export function formatOutput(
  data: unknown,
  format: OutputFormat = 'table',
  options: OutputOptions = {}
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'yaml':
      return yaml.dump(data, { indent: 2, lineWidth: 120 });
    case 'plain':
      return formatPlain(data, options);
    case 'markdown':
      return formatMarkdown(data, options);
    case 'table':
    default:
      return formatTable(data, options);
  }
}

export function formatTable(data: unknown, options: OutputOptions = {}): string {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return 'No results found.';
    }

    const firstItem = data[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      return formatPlain(data, options);
    }

    const keys = Object.keys(firstItem);
    const table = new Table({
      head: keys.map((k) => (options.noColor ? k : chalk.bold(k))),
      style: {
        head: options.noColor ? [] : ['cyan'],
        border: options.noColor ? [] : ['gray'],
      },
    });

    for (const item of data) {
      const row = keys.map((key) => {
        const value = (item as Record<string, unknown>)[key];
        return formatValue(value, options);
      });
      table.push(row);
    }

    return table.toString();
  } else if (typeof data === 'object' && data !== null) {
    const table = new Table({
      style: {
        head: options.noColor ? [] : ['cyan'],
        border: options.noColor ? [] : ['gray'],
      },
    });

    for (const [key, value] of Object.entries(data)) {
      table.push({
        [options.noColor ? key : chalk.bold(key)]: formatValue(value, options),
      });
    }

    return table.toString();
  }

  return String(data);
}

export function formatPlain(data: unknown, options: OutputOptions = {}): string {
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return Object.values(item)
            .map((v) => formatValue(v, options))
            .join('\t');
        }
        return formatValue(item, options);
      })
      .join('\n');
  } else if (typeof data === 'object' && data !== null) {
    return Object.entries(data)
      .map(([key, value]) => `${key}\t${formatValue(value, options)}`)
      .join('\n');
  }

  return String(data);
}

export function formatMarkdown(data: unknown, options: OutputOptions = {}): string {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return 'No results found.';
    }

    const firstItem = data[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      return data.map((item) => formatValue(item, options)).join('\n');
    }

    const keys = Object.keys(firstItem);
    let output = '| ' + keys.join(' | ') + ' |\n';
    output += '| ' + keys.map(() => '---').join(' | ') + ' |\n';

    for (const item of data) {
      const row = keys.map((key) => {
        const value = (item as Record<string, unknown>)[key];
        return formatValue(value, { ...options, full: true });
      });
      output += '| ' + row.join(' | ') + ' |\n';
    }

    return output;
  } else if (typeof data === 'object' && data !== null) {
    let output = '';
    for (const [key, value] of Object.entries(data)) {
      output += `- **${key}**: ${formatValue(value, options)}\n`;
    }
    return output;
  }

  return String(data);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function formatValue(value: unknown, options: OutputOptions = {}): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const text = truncateText(value, options);
    if (options.format === 'markdown') {
      return text.replace(/\|/g, '\\|');
    }
    return text;
  }
  if (Array.isArray(value)) return value.map((v) => formatValue(v, options)).join(', ');
  if (isObject(value)) return JSON.stringify(value);
  return String(value);
}

export function truncateText(text: string, options: OutputOptions = {}): string {
  if (options.full) {
    return text;
  }

  const maxLength = options.terse ? 50 : 100;
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

type ChalkColor = 'red' | 'green' | 'yellow' | 'blue' | 'cyan' | 'magenta' | 'white' | 'gray' | 'grey';

const CHALK_COLORS: Record<ChalkColor, (text: string) => string> = {
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  cyan: chalk.cyan,
  magenta: chalk.magenta,
  white: chalk.white,
  gray: chalk.gray,
  grey: chalk.grey,
};

export function colorize(text: string, color: string, noColor = false): string {
  if (noColor) return text;

  const colorFn = CHALK_COLORS[color as ChalkColor];
  if (!colorFn) {
    if (process.env.DEBUG) {
      console.warn(`Unknown color: ${color}, using default`);
    }
    return text;
  }

  return colorFn(text);
}
