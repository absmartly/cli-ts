import type { APIClient } from '../../../api-client/api-client.js';
import type { ExperimentId } from '../../../lib/api/branded-types.js';
import type { CommandResult } from '../../types.js';
import { extractSignals } from './extract-signals.js';
import {
  computeAnalysisConfidence,
  computeDesignReadout,
  runHeuristics,
} from './heuristics.js';
import { summarizeRelatedExperiments } from './related-benchmarks.js';
import { SourceSignalRegistry } from './source-signals.js';
import type {
  AnalyzeAlert,
  AnalyzeExperimentSection,
  AnalyzeResult,
} from './types.js';

export interface AnalyzeExperimentParams {
  experimentId: ExperimentId;
}

export async function analyzeExperiment(
  client: APIClient,
  params: AnalyzeExperimentParams
): Promise<CommandResult<AnalyzeResult>> {
  const registry = new SourceSignalRegistry();

  const experimentPromise = client.getExperiment(params.experimentId);
  const experiment = (await experimentPromise) as Record<string, unknown>;
  const expType = (experiment.type as string | undefined) ?? '';

  const relatedPromise = client.listExperiments({
    type: expType,
    items: 25,
    sort: 'updated_at',
    ascending: false,
  }).catch((err: unknown) => {
    registry.record(
      'related_experiments',
      `error: ${err instanceof Error ? err.message : String(err)}`
    );
    return [] as Array<Record<string, unknown>>;
  });

  const alerts = await resolveAlerts(client, params.experimentId, experiment, registry);
  const related = (await relatedPromise) as Array<Record<string, unknown>>;

  const { metricSignals, leadingVariant, participantCount } = extractSignals(experiment as never);
  if (participantCount !== null) {
    registry.record('experiment.participant_count', 'experiment.metrics_snapshot.rows[*].cum_unit_count');
  }
  if (leadingVariant) {
    registry.record(
      'experiment.leading_variant_impact_percent',
      'experiment.metrics_snapshot.rows[*].percent_change'
    );
  }

  const benchmarks = await summarizeRelatedExperiments(
    client,
    { id: Number(params.experimentId), primary_metric_id: numOrNull(experiment.primary_metric_id) },
    related as never,
    registry
  );

  const heuristicsInput = {
    experiment: experiment as never,
    alerts,
    metricSignals,
    leadingVariant,
    participantCount,
    benchmark: benchmarks.benchmark,
  };

  const { heuristicOutput, recommendation } = runHeuristics(heuristicsInput);
  const analysisConfidence = computeAnalysisConfidence(heuristicsInput);
  const designReadout = computeDesignReadout(heuristicsInput);

  if (alerts.length > 0) {
    registry.record('alerts', `experiment.alerts[*].type`);
  }
  if ((experiment.recommended_action as { recommendation?: unknown } | undefined)?.recommendation) {
    registry.record('experiment.current_recommended_action', 'experiment.recommended_action.recommendation');
  }
  if (
    (experiment.experiment_report as { experiment_note?: { note?: unknown } } | undefined)
      ?.experiment_note?.note
  ) {
    registry.record('experiment.report_note', 'experiment.experiment_report.experiment_note.note');
  }

  const experimentSection: AnalyzeExperimentSection = {
    id: numOrNull(experiment.id) ?? Number(params.experimentId),
    name: stringOr(experiment.name, ''),
    type: stringOr(experiment.type, ''),
    state: stringOr(experiment.state, ''),
    hypothesis: stringOrNull(experiment.hypothesis),
    primary_metric_name:
      ((experiment.primary_metric as { name?: string } | undefined)?.name) ?? null,
    unit_type_name: ((experiment.unit_type as { name?: string } | undefined)?.name) ?? null,
    participant_count: participantCount,
    leading_variant_name: leadingVariant?.variant_name ?? null,
    leading_variant_impact_percent: leadingVariant?.impact_percent ?? null,
    leading_variant_confidence:
      leadingVariant && leadingVariant.p_value !== null ? 1 - leadingVariant.p_value : null,
    current_recommended_action:
      ((experiment.recommended_action as { recommendation?: string } | undefined)?.recommendation) ??
      null,
    report_note:
      ((experiment.experiment_report as { experiment_note?: { note?: string } } | undefined)
        ?.experiment_note?.note) ?? null,
  };

  const data: AnalyzeResult = {
    experiment: experimentSection,
    alerts,
    recommendation,
    metric_signals: metricSignals,
    related_experiments: benchmarks.items,
    analysis_confidence: analysisConfidence,
    design_readout: designReadout,
    source_signals: registry.toArray(),
    heuristic_output: heuristicOutput,
  };

  return { data, detail: data as unknown as Record<string, unknown> };
}

async function resolveAlerts(
  client: APIClient,
  experimentId: ExperimentId,
  experiment: Record<string, unknown>,
  registry: SourceSignalRegistry
): Promise<AnalyzeAlert[]> {
  const embedded = experiment.alerts;
  if (Array.isArray(embedded)) return embedded.map(toAlert);
  try {
    const list = await client.listExperimentAlerts(experimentId);
    return list.map(toAlert);
  } catch (err) {
    registry.record(
      'alerts',
      `error: ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}

function toAlert(raw: unknown): AnalyzeAlert {
  const r = (raw ?? {}) as { id?: unknown; type?: unknown; dismissed?: unknown };
  return {
    id: typeof r.id === 'number' ? r.id : 0,
    type: typeof r.type === 'string' ? r.type : '',
    dismissed: r.dismissed === true,
  };
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
