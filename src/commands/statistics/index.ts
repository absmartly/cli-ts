import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { validateJSON } from '../../lib/utils/validators.js';
import { getPowerMatrix as coreGetPowerMatrix } from '../../core/statistics/statistics.js';

export const statisticsCommand = new Command('statistics')
  .aliases(['stats', 'stat'])
  .description('Statistical analysis commands');

function parseNumberList(value: string): number[] {
  return value.split(',').map(s => {
    const n = Number(s.trim());
    if (isNaN(n)) throw new Error(`Invalid number: "${s.trim()}"`);
    return n;
  });
}

function formatParticipants(n: number): string {
  if (n >= 1_000_000 && n % 1_000_000 === 0) return `${n / 1_000_000}M`;
  if (n >= 1_000 && n % 1_000 === 0) return `${n / 1_000}K`;
  return n.toLocaleString();
}

function formatMDE(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

interface PowerMatrixConfig {
  analysis_type?: string;
  sample_sizes?: number[];
  minimum_detectable_effects?: number[];
  powers?: number[];
  alphas?: number[];
  power?: number;
  alpha?: number;
  split?: number[];
  metric_type?: string;
  metric_mean?: number;
  metric_variance?: number;
  metric_custom_statistics_type?: string;
  two_sided?: boolean;
  participants_per_week?: number;
  group_sequential_futility_type?: string;
  group_sequential_first_analysis_interval?: string;
  group_sequential_min_analysis_interval?: string;
}

const RECURRENCE_ALIASES: Record<string, string> = {
  d: 'day', day: 'day', daily: 'day',
  w: 'week', week: 'week', weekly: 'week',
  m: 'month', month: 'month', monthly: 'month',
};

function parseParticipants(value: string): { count: number; recurrence: string } {
  const match = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\w+)$/);
  if (!match) {
    const n = Number(value);
    if (!isNaN(n)) return { count: n, recurrence: 'week' };
    throw new Error(`Invalid --participants format: "${value}". Use <number>/<unit> (e.g., 1000/week, 500/day, 30000/month)`);
  }

  const count = Number(match[1]);
  const unit = RECURRENCE_ALIASES[match[2]!.toLowerCase()];
  if (!unit) {
    throw new Error(`Invalid recurrence unit: "${match[2]}". Use day (d), week (w), or month (m)`);
  }

  return { count, recurrence: unit };
}

function toParticipantsPerWeek(participants: number, recurrence: string): number {
  switch (recurrence) {
    case 'day': return participants * 7;
    case 'month': return (participants / 30) * 7;
    default: return participants;
  }
}

function buildConfigFromOptions(options: Record<string, unknown>): PowerMatrixConfig {
  const config: PowerMatrixConfig = {};

  if (options.analysisType) config.analysis_type = options.analysisType as string;
  if (options.metricType) config.metric_type = options.metricType as string;
  if (options.metricMean !== undefined) config.metric_mean = Number(options.metricMean);
  if (options.metricVariance !== undefined) config.metric_variance = Number(options.metricVariance);
  if (options.metricCustomStatisticsType) config.metric_custom_statistics_type = options.metricCustomStatisticsType as string;
  if (options.alpha !== undefined) config.alpha = Number(options.alpha);
  if (options.powers) config.powers = parseNumberList(options.powers as string);
  if (options.split) config.split = parseNumberList(options.split as string);
  if (options.sampleSizes) config.sample_sizes = parseNumberList(options.sampleSizes as string);
  if (options.minimumDetectableEffects) config.minimum_detectable_effects = parseNumberList(options.minimumDetectableEffects as string);
  if (options.twoSided) config.two_sided = true;
  if (options.futilityType) config.group_sequential_futility_type = options.futilityType as string;
  if (options.firstAnalysis) config.group_sequential_first_analysis_interval = options.firstAnalysis as string;
  if (options.minAnalysisInterval) config.group_sequential_min_analysis_interval = options.minAnalysisInterval as string;

  if (options.participants !== undefined) {
    const { count, recurrence } = parseParticipants(options.participants as string);
    config.participants_per_week = toParticipantsPerWeek(count, recurrence);
  }

  return config;
}

function formatPowerMatrixTable(
  matrix: number[][],
  config: PowerMatrixConfig,
  noColor: boolean,
): string {
  const powers = config.powers ?? (config.power !== undefined ? [config.power] : [0.8]);
  const sampleSizes = config.sample_sizes;
  const mdes = config.minimum_detectable_effects;
  const participantsPerWeek = config.participants_per_week;

  const isTimeBased = sampleSizes && participantsPerWeek;
  const isMDEBased = !!mdes;

  let rowLabel: string;
  let rowLabels: string[];

  if (isMDEBased) {
    rowLabel = 'MDE / Power';
    rowLabels = mdes.map(m => formatMDE(m));
  } else if (isTimeBased) {
    rowLabel = 'Max runtime';
    rowLabels = sampleSizes.map(s => `${Math.round(s / participantsPerWeek)}w`);
  } else if (sampleSizes) {
    rowLabel = 'Participants / Power';
    rowLabels = sampleSizes.map(s => formatParticipants(s));
  } else {
    rowLabel = 'Row';
    rowLabels = matrix.map((_, i) => String(i + 1));
  }

  const powerHeaders = powers.map(p => `${(p * 100).toFixed(0)}%`);

  const table = new Table({
    head: [
      noColor ? rowLabel : chalk.cyan(rowLabel),
      ...powerHeaders.map(h => noColor ? h : chalk.cyan(h)),
    ],
    style: {
      head: [],
      border: noColor ? [] : ['gray'],
    },
    colAligns: ['left', ...powerHeaders.map(() => 'right' as const)],
  });

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!;
    table.push([
      rowLabels[i] ?? String(i + 1),
      ...row.map(v => formatMDE(v)),
    ]);
  }

  return table.toString();
}

const powerMatrixCommand = new Command('power-matrix')
  .description(`Calculate power analysis matrix (minimum detectable effects or required sample sizes)

Examples:
  # Max runtime mode — how long to run for a given MDE at 80% power
  abs stats power-matrix \\
    --analysis-type group_sequential --metric-type goal_count \\
    --metric-mean 10 --metric-variance 10000 \\
    --sample-sizes 2000,3000,4000,5000,6000 \\
    --powers 0.8 --alpha 0.1 --split 0.5,0.5 \\
    --participants 1000/week \\
    --futility-type binding --first-analysis 7d --min-analysis-interval 1d

  # MDE mode — what effect size is detectable at each sample size
  abs stats power-matrix \\
    --metric-type goal_count --metric-mean 10 --metric-variance 10000 \\
    --minimum-detectable-effects 0.05,0.10,0.15 --powers 0.8

  # Raw JSON config (passed directly to the API)
  abs stats power-matrix --config '{"sample_sizes":[2000,3000],...}'`)
  .option('--config <json>', 'power analysis configuration as JSON (alternative to individual options)')
  .option('--analysis-type <type>', 'analysis type (e.g., group_sequential)')
  .option('--metric-type <type>', 'metric type (e.g., goal_count, goal_unique)')
  .option('--metric-mean <n>', 'metric mean (μ)', parseFloat)
  .option('--metric-variance <n>', 'metric variance (σ²)', parseFloat)
  .option('--metric-custom-statistics-type <type>', 'custom statistics type')
  .option('--alpha <n>', 'significance level', parseFloat)
  .option('--powers <values>', 'power levels, comma-separated (e.g., 0.8,0.9)')
  .option('--split <ratios>', 'traffic split, comma-separated (e.g., 0.5,0.5)')
  .option('--sample-sizes <sizes>', 'sample sizes, comma-separated')
  .option('--minimum-detectable-effects <values>', 'MDEs, comma-separated')
  .option('--two-sided', 'use two-sided test')
  .option('--participants <n/unit>', 'participant rate as <count>/<unit> where unit is day, week, or month (e.g., 1000/week, 500/day, 30000/month). Plain number defaults to per week. Enables time-based display when used with --sample-sizes')
  .option('--futility-type <type>', 'futility type (binding, non_binding)')
  .option('--first-analysis <interval>', 'first analysis interval (e.g., 7d)')
  .option('--min-analysis-interval <interval>', 'min interval between analyses (e.g., 1d)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(powerMatrixCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let config: PowerMatrixConfig;
    if (options.config) {
      config = validateJSON(options.config, '--config') as PowerMatrixConfig;
    } else {
      config = buildConfigFromOptions(options);
      if (!config.metric_type || config.metric_mean === undefined || config.metric_variance === undefined) {
        throw new Error('Required: --metric-type, --metric-mean, and --metric-variance (or use --config with JSON)');
      }
      if (!config.sample_sizes && !config.minimum_detectable_effects) {
        throw new Error('Required: --sample-sizes or --minimum-detectable-effects (or use --config with JSON)');
      }
    }

    const result = await coreGetPowerMatrix(client, { config: config as Record<string, unknown> });

    if (globalOptions.raw || globalOptions.output === 'json' || globalOptions.output === 'yaml') {
      printFormatted(result.data, globalOptions);
    } else {
      const matrix = result.data as { matrix: number[][] };
      console.log(formatPowerMatrixTable(matrix.matrix, config, globalOptions.noColor ?? false));
    }
  }));

statisticsCommand.addCommand(powerMatrixCommand);
