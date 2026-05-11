import type {
  AnalysisConfidence,
  DesignReadout,
  HeuristicEntry,
  LeadingVariant,
  MetricSignal,
  Recommendation,
  Theme,
} from './types.js';

const BLOCKING_ALERT_TYPES = new Set([
  'srm',
  'audience_mismatch',
  'assignment_conflict',
  'experiments_interact',
]);

const RECOMMENDATION_OVERDUE_DAYS = 21;
const DEFAULT_ALPHA = 0.1;

interface AlertLite {
  id: number;
  type: string;
  dismissed: boolean;
}

interface ExpLite {
  state?: string;
  hypothesis?: string | null;
  primary_metric_id?: number | null;
  required_alpha?: string | number | null;
  required_power?: string | number | null;
  analysis_type?: string | null;
  minimum_detectable_effect?: number | null;
  baseline_primary_metric_mean?: number | null;
  baseline_participants_per_day?: number | null;
  percentage_of_traffic?: number | null;
  secondary_metrics?: Array<{ type?: string }>;
  recommended_action?: unknown;
  started_at?: string | null;
  stopped_at?: string | null;
}

export interface HeuristicsInput {
  experiment: ExpLite;
  alerts: AlertLite[];
  metricSignals: MetricSignal[];
  leadingVariant: LeadingVariant | null;
  participantCount: number | null;
  benchmark: { observed_impacts: number[]; median_abs_impact: number | null } | null;
}

const RULE_ORDER = [
  'blocking_alert',
  'cleanup_needed',
  'guardrail_contradicts',
  'primary_metric_significant_loss',
  'primary_metric_significant_win',
  'sample_size_not_reached',
  'hypothesis_missing',
  'no_recommendation_overdue',
  'snapshot_unavailable',
] as const;

type RuleId = (typeof RULE_ORDER)[number];

type RuleFn = (input: HeuristicsInput) => HeuristicEntry;

const rules: Record<RuleId, RuleFn> = {
  blocking_alert: (input) => {
    const hits = input.alerts.filter((a) => !a.dismissed && BLOCKING_ALERT_TYPES.has(a.type));
    return entry(
      'blocking_alert',
      hits.length > 0,
      'warning',
      'Investigate the experiment before making a rollout decision.',
      'Active health checks indicate that the current results may be misleading. Resolve the data-quality or assignment issue before acting on the outcome.',
      { alert_types: hits.map((h) => h.type) }
    );
  },
  cleanup_needed: (input) => {
    const hits = input.alerts.filter((a) => !a.dismissed && a.type === 'cleanup_needed');
    return entry(
      'cleanup_needed',
      hits.length > 0,
      'warning',
      'Clean up stale assignments before proceeding.',
      'The experiment has cleanup_needed signals; old data may skew the analysis.',
      { alert_ids: hits.map((h) => h.id) }
    );
  },
  guardrail_contradicts: (input) => {
    const hits = input.metricSignals.filter(
      (s) => s.metric_type === 'guardrail' && s.status === 'contradicts'
    );
    const variant = input.leadingVariant?.variant_name ?? 'the leading variant';
    return entry(
      'guardrail_contradicts',
      hits.length > 0,
      'warning',
      `Review guardrail regressions before rolling out ${variant}.`,
      'At least one guardrail metric is moving in the wrong direction, so the apparent win on the primary metric should not be treated as rollout-ready yet.',
      { metrics: hits.map((h) => h.metric_name) }
    );
  },
  primary_metric_significant_loss: (input) => {
    const lv = input.leadingVariant;
    const alpha = parseAlpha(input.experiment.required_alpha) ?? DEFAULT_ALPHA;
    const fired = !!lv && lv.p_value !== null && lv.p_value < alpha && lv.impact_percent < 0;
    return entry(
      'primary_metric_significant_loss',
      fired,
      'warning',
      'Primary metric regressed at significance.',
      'The leading variant moves the primary metric in the wrong direction with p-value below alpha. Do not roll out.',
      lv ? { variant: lv.variant_name, impact_percent: lv.impact_percent, p_value: lv.p_value } : {}
    );
  },
  primary_metric_significant_win: (input) => {
    const lv = input.leadingVariant;
    const alpha = parseAlpha(input.experiment.required_alpha) ?? DEFAULT_ALPHA;
    const fired = !!lv && lv.p_value !== null && lv.p_value < alpha && lv.impact_percent > 0;
    return entry(
      'primary_metric_significant_win',
      fired,
      'success',
      `Primary metric improved with ${lv?.variant_name ?? 'the leading variant'}.`,
      'The leading variant beat baseline on the primary metric with p-value below alpha.',
      lv ? { variant: lv.variant_name, impact_percent: lv.impact_percent, p_value: lv.p_value } : {}
    );
  },
  sample_size_not_reached: (input) => {
    const isRunningGS =
      input.experiment.state === 'running' && input.experiment.analysis_type === 'group_sequential';
    const hasReachedAlert = input.alerts.some(
      (a) => !a.dismissed && a.type === 'sample_size_reached'
    );
    const fired = isRunningGS && !hasReachedAlert;
    return entry(
      'sample_size_not_reached',
      fired,
      'info',
      'Sample size not reached.',
      'Group-sequential analysis has not yet hit its planned sample size; treat results as interim.',
      {}
    );
  },
  hypothesis_missing: (input) => {
    const fired = !input.experiment.hypothesis || input.experiment.hypothesis.trim() === '';
    return entry(
      'hypothesis_missing',
      fired,
      'info',
      'No hypothesis recorded for this experiment.',
      'Without a written hypothesis it is hard to judge whether the result answers the original question.',
      {}
    );
  },
  no_recommendation_overdue: (input) => {
    const startedAt = input.experiment.started_at ? Date.parse(input.experiment.started_at) : NaN;
    const days = Number.isFinite(startedAt) ? (Date.now() - startedAt) / 86400000 : 0;
    const fired = days >= RECOMMENDATION_OVERDUE_DAYS && !input.experiment.recommended_action;
    return entry(
      'no_recommendation_overdue',
      fired,
      'info',
      'Experiment has been running long without a recommended action.',
      'Consider whether to stop, full-on, or iterate; running indefinitely is rarely the best option.',
      { days_running: Math.floor(days) }
    );
  },
  snapshot_unavailable: (input) => {
    const fired = input.participantCount === null && input.metricSignals.length === 0;
    return entry(
      'snapshot_unavailable',
      fired,
      'info',
      'No metric snapshot is available yet.',
      'The previewer may not have processed this experiment; analysis is limited to design parameters.',
      {}
    );
  },
};

export function runHeuristics(input: HeuristicsInput): {
  heuristicOutput: HeuristicEntry[];
  recommendation: Recommendation | null;
} {
  const heuristicOutput = RULE_ORDER.map((id) => rules[id](input));
  const picked = pickRecommendation(heuristicOutput);
  const recommendation: Recommendation | null = picked
    ? { theme: picked.theme, title: picked.title, details: picked.details }
    : null;
  return { heuristicOutput, recommendation };
}

function pickRecommendation(entries: HeuristicEntry[]): HeuristicEntry | null {
  const firstWarning = entries.find((h) => h.fired && h.theme === 'warning');
  if (firstWarning) return firstWarning;
  const firstSuccess = entries.find((h) => h.fired && h.theme === 'success');
  if (firstSuccess) return firstSuccess;
  return null;
}

export function computeAnalysisConfidence(input: HeuristicsInput): AnalysisConfidence {
  const hasBlockingAlert = input.alerts.some(
    (a) => !a.dismissed && BLOCKING_ALERT_TYPES.has(a.type)
  );
  const sampleReached = input.alerts.some((a) => !a.dismissed && a.type === 'sample_size_reached');
  const hypothesisPresent =
    !!input.experiment.hypothesis && input.experiment.hypothesis.trim() !== '';
  const primaryPresent =
    input.experiment.primary_metric_id !== null && input.experiment.primary_metric_id !== undefined;
  const guardrailsPresent = (input.experiment.secondary_metrics ?? []).some(
    (m) => m.type === 'guardrail'
  );
  const noBlockingAlerts = !hasBlockingAlert;

  const factors = {
    sample_size_reached: sampleReached,
    hypothesis_present: hypothesisPresent,
    primary_metric_present: primaryPresent,
    guardrails_present: guardrailsPresent,
    no_blocking_alerts: noBlockingAlerts,
  };

  const reasons: string[] = [];
  if (!sampleReached) reasons.push('Planned sample size has not been reached.');
  if (!hypothesisPresent) reasons.push('No written hypothesis.');
  if (!primaryPresent) reasons.push('No primary metric selected.');
  if (!guardrailsPresent) reasons.push('No guardrail metric configured.');
  if (!noBlockingAlerts) reasons.push('A blocking health alert is active.');

  const missing = Object.values(factors).filter((v) => !v).length;
  let level: AnalysisConfidence['level'];
  if (!noBlockingAlerts || missing >= 2) level = 'low';
  else if (missing === 1) level = 'medium';
  else level = 'high';

  return { level, reasons, factors };
}

export function computeDesignReadout(input: HeuristicsInput): DesignReadout {
  const exp = input.experiment;
  const params = {
    analysis_type: exp.analysis_type ?? null,
    required_alpha: parseAlpha(exp.required_alpha),
    required_power: numOrNull(exp.required_power),
    minimum_detectable_effect: numOrNull(exp.minimum_detectable_effect),
    baseline_primary_metric_mean: numOrNull(exp.baseline_primary_metric_mean),
    baseline_participants_per_day: numOrNull(exp.baseline_participants_per_day),
    percentage_of_traffic: numOrNull(exp.percentage_of_traffic),
  };

  const benchmark = input.benchmark;
  const mde = params.minimum_detectable_effect;

  let summary: string;
  if (benchmark && benchmark.median_abs_impact !== null && mde !== null) {
    if (benchmark.median_abs_impact >= mde * 1.5) {
      summary = `Designed to detect effects in the expected range; comparable experiments moved this metric by ~${benchmark.median_abs_impact}%.`;
    } else if (benchmark.median_abs_impact <= mde * 0.5) {
      summary = `MDE is larger than what comparable experiments have moved (~${benchmark.median_abs_impact}%); the next run should plan for a smaller expected effect or longer runtime.`;
    } else {
      summary = `Design appears usable; comparable experiments moved this metric by ~${benchmark.median_abs_impact}%.`;
    }
  } else if (benchmark && benchmark.median_abs_impact !== null) {
    summary = `Comparable experiments moved this metric by ~${benchmark.median_abs_impact}%; review against the planned MDE.`;
  } else {
    summary =
      'Insufficient comparable history to benchmark the design — review MDE against domain knowledge.';
  }

  const notes: string[] = [];
  if (params.percentage_of_traffic !== null && params.percentage_of_traffic < 20) {
    notes.push(`Traffic share is only ${params.percentage_of_traffic}%; expect long runtimes.`);
  }
  if (params.baseline_primary_metric_mean === null) {
    notes.push('No baseline mean recorded for the primary metric.');
  }
  if (input.experiment.started_at) {
    const days = (Date.now() - Date.parse(input.experiment.started_at)) / 86400000;
    if (days < 7 && input.experiment.state === 'running') {
      notes.push('Less than a week of runtime so far.');
    }
    if (days > 90) notes.push('Experiment has been running over 90 days; consider closing it out.');
  }

  return { summary, notes, parameters: params, benchmark };
}

function entry(
  rule: RuleId,
  fired: boolean,
  theme: Theme,
  title: string,
  details: string,
  evidence: Record<string, unknown>
): HeuristicEntry {
  return { rule, fired, theme, title, details, evidence };
}

function parseAlpha(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

function numOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
