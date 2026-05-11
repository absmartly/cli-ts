import type { AnalyzeResult } from './types.js';

export function summarizeAnalyzeResult(result: AnalyzeResult): Record<string, unknown> {
  const exp = result.experiment;
  const conf =
    typeof exp.leading_variant_confidence === 'number'
      ? Math.round(exp.leading_variant_confidence * 1000) / 1000
      : null;
  return {
    id: exp.id,
    name: exp.name,
    type: exp.type,
    state: exp.state,
    primary_metric: exp.primary_metric_name,
    unit_type: exp.unit_type_name,
    participants: exp.participant_count,
    leading_variant: exp.leading_variant_name,
    leading_impact_pct: exp.leading_variant_impact_percent,
    leading_confidence: conf,
    analysis_confidence: result.analysis_confidence.level,
    analysis_confidence_reasons: result.analysis_confidence.reasons.join('; '),
    recommendation: result.recommendation?.title ?? null,
    recommendation_theme: result.recommendation?.theme ?? null,
    design_summary: result.design_readout.summary,
    design_notes: result.design_readout.notes.join('; '),
    current_recommended_action: exp.current_recommended_action,
    report_note: exp.report_note,
    alerts_count: result.alerts.length,
    metric_signals_count: result.metric_signals.length,
    related_experiments_count: result.related_experiments.length,
    heuristics_fired: result.heuristic_output
      .filter((h) => h.fired)
      .map((h) => h.rule)
      .join(', '),
    source_signals_count: result.source_signals.length,
  };
}
