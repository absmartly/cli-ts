import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';
import { extractMetricInfos, extractVariantNames, fetchAllMetricResults, formatResultRows } from '../../api-client/metric-results.js';

export interface WatchExperimentParams {
  experimentId: ExperimentId;
  variantIndex?: boolean;
}

export interface WatchExperimentResult {
  displayName: string;
  state: string;
  results: unknown[];
  formattedRows: Record<string, unknown>[];
  resultsJson: string;
  hasMetrics: boolean;
}

export async function watchExperimentTick(
  client: APIClient,
  params: WatchExperimentParams,
): Promise<CommandResult<WatchExperimentResult>> {
  const experiment = await client.getExperiment(params.experimentId);
  const exp = experiment as Record<string, unknown>;
  const metricInfos = extractMetricInfos(exp);
  const variantNames = extractVariantNames(exp);

  if (metricInfos.length === 0) {
    return {
      data: {
        displayName: (exp.display_name || exp.name) as string,
        state: exp.state as string,
        results: [],
        formattedRows: [],
        resultsJson: '[]',
        hasMetrics: false,
      },
    };
  }

  const formatOpts: { variantIndex?: boolean } = {};
  if (params.variantIndex !== undefined) formatOpts.variantIndex = params.variantIndex;

  const results = await fetchAllMetricResults(client, params.experimentId, metricInfos);
  const formattedRows = results.flatMap(r => formatResultRows(r, variantNames, formatOpts));
  const resultsJson = JSON.stringify(results);

  return {
    data: {
      displayName: (exp.display_name || exp.name) as string,
      state: exp.state as string,
      results,
      formattedRows,
      resultsJson,
      hasMetrics: true,
    },
  };
}
