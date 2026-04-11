export interface SecondaryMetricEntry {
  metric_id: number;
  type: string;
  order_index: number;
}

export function buildSecondaryMetrics(categories: {
  secondary?: Array<{ id: number }>;
  guardrail?: Array<{ id: number }>;
  exploratory?: Array<{ id: number }>;
}): SecondaryMetricEntry[] {
  const result: SecondaryMetricEntry[] = [];
  let orderIndex = 0;

  for (const metric of categories.secondary ?? []) {
    result.push({ metric_id: metric.id, type: 'secondary', order_index: orderIndex++ });
  }
  for (const metric of categories.guardrail ?? []) {
    result.push({ metric_id: metric.id, type: 'guardrail', order_index: orderIndex++ });
  }
  for (const metric of categories.exploratory ?? []) {
    result.push({ metric_id: metric.id, type: 'exploratory', order_index: orderIndex++ });
  }

  return result;
}
