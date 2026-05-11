export type MetricKind = 'primary' | 'secondary' | 'guardrail' | 'exploratory';
export type SignalStatus = 'improves' | 'contradicts' | 'flat' | 'inconclusive';
export type Theme = 'success' | 'warning' | 'info' | 'neutral';

export interface MetricSignal {
  metric_id: number;
  metric_name: string;
  metric_type: MetricKind;
  variant_id: number;
  variant_name: string;
  percent_change: number | null;
  p_value: number | null;
  ci_low: number | null;
  ci_high: number | null;
  status: SignalStatus;
}

export interface LeadingVariant {
  variant_id: number;
  variant_name: string;
  impact_percent: number;
  p_value: number | null;
}

export interface HeuristicEntry {
  rule: string;
  fired: boolean;
  theme: Theme;
  title: string;
  details: string;
  evidence: Record<string, unknown>;
}

export interface Recommendation {
  theme: Theme;
  title: string;
  details: string;
}

export interface AnalysisConfidence {
  level: 'high' | 'medium' | 'low';
  reasons: string[];
  factors: {
    sample_size_reached: boolean;
    hypothesis_present: boolean;
    primary_metric_present: boolean;
    guardrails_present: boolean;
    no_blocking_alerts: boolean;
  };
}

export interface DesignReadout {
  summary: string;
  notes: string[];
  parameters: {
    analysis_type: string | null;
    required_alpha: number | null;
    required_power: number | null;
    minimum_detectable_effect: number | null;
    baseline_primary_metric_mean: number | null;
    baseline_participants_per_day: number | null;
    percentage_of_traffic: number | null;
  };
  benchmark: {
    observed_impacts: number[];
    median_abs_impact: number | null;
  } | null;
}

export interface RelatedExperimentSummary {
  id: number;
  name: string;
  state: string;
  started_at: string | null;
  stopped_at: string | null;
  primary_metric_id: number | null;
  primary_metric_name: string | null;
  leading_variant_impact_percent: number | null;
}

export interface AnalyzeExperimentSection {
  id: number;
  name: string;
  type: string;
  state: string;
  hypothesis: string | null;
  primary_metric_name: string | null;
  unit_type_name: string | null;
  participant_count: number | null;
  leading_variant_name: string | null;
  leading_variant_impact_percent: number | null;
  leading_variant_confidence: number | null;
  current_recommended_action: string | null;
  report_note: string | null;
}

export interface AnalyzeAlert {
  id: number;
  type: string;
  dismissed: boolean;
}

export interface SourceSignal {
  covers: string;
  source: string;
}

export interface AnalyzeResult {
  experiment: AnalyzeExperimentSection;
  alerts: AnalyzeAlert[];
  recommendation: Recommendation | null;
  metric_signals: MetricSignal[];
  related_experiments: RelatedExperimentSummary[];
  analysis_confidence: AnalysisConfidence;
  design_readout: DesignReadout;
  source_signals: SourceSignal[];
  heuristic_output: HeuristicEntry[];
}
