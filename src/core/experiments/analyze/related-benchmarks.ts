import type { APIClient } from '../../../api-client/api-client.js';
import { ExperimentId } from '../../../api-client/types.js';
import { leadingPrimaryImpactFromSnapshot } from './extract-signals.js';
import { SourceSignalRegistry } from './source-signals.js';
import type { RelatedExperimentSummary } from './types.js';

interface RelatedRaw {
  id: number;
  name?: string;
  state?: string;
  started_at?: string | null;
  stopped_at?: string | null;
  primary_metric_id?: number | null;
  primary_metric?: { id?: number; name?: string };
}

interface FocalRaw {
  id: number;
  primary_metric_id?: number | null;
}

export async function summarizeRelatedExperiments(
  client: Pick<APIClient, 'getExperimentMetricsCached'>,
  focal: FocalRaw,
  related: RelatedRaw[],
  registry: SourceSignalRegistry
): Promise<{
  items: RelatedExperimentSummary[];
  benchmark: { observed_impacts: number[]; median_abs_impact: number | null } | null;
}> {
  const focalPrimary = focal.primary_metric_id ?? null;
  const filtered = related.filter((r) => r.id !== focal.id).slice(0, 24);

  let attemptedFetches = 0;
  const fetches = filtered.map(async (rel) => {
    const sharesMetric =
      focalPrimary !== null &&
      (rel.primary_metric_id ?? rel.primary_metric?.id ?? null) === focalPrimary;

    let impact: number | null = null;
    if (sharesMetric) {
      attemptedFetches++;
      try {
        const snap = await client.getExperimentMetricsCached(ExperimentId(rel.id));
        impact = leadingPrimaryImpactFromSnapshot(snap, focalPrimary!);
        registry.record(
          `related_experiments[${rel.id}].leading_variant_impact_percent`,
          `experiments/${rel.id}/metrics/main.percent_change`
        );
      } catch (err) {
        registry.record(
          `related_experiments[${rel.id}]`,
          `error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    const summary: RelatedExperimentSummary = {
      id: rel.id,
      name: rel.name ?? '',
      state: rel.state ?? '',
      started_at: rel.started_at ?? null,
      stopped_at: rel.stopped_at ?? null,
      primary_metric_id: rel.primary_metric_id ?? rel.primary_metric?.id ?? null,
      primary_metric_name: rel.primary_metric?.name ?? null,
      leading_variant_impact_percent: impact,
    };
    return summary;
  });

  const items = await Promise.all(fetches);
  const observed = items
    .map((i) => i.leading_variant_impact_percent)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

  let benchmark: { observed_impacts: number[]; median_abs_impact: number | null } | null = null;
  if (attemptedFetches >= 2) {
    benchmark = {
      observed_impacts: observed,
      median_abs_impact: observed.length > 0 ? median(observed.map(Math.abs)) : null,
    };
  }
  return { items, benchmark };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  if (sorted.length === 0) return 0;
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
