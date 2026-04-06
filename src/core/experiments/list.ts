import type { APIClient } from '../../api-client/api-client.js';
import type { ListOptions } from '../../lib/api/types.js';
import type { CommandResult } from '../types.js';
import { summarizeExperimentRow } from '../../api-client/experiment-summary.js';
import { parseDateFlagOrUndefined } from '../../lib/utils/date-parser.js';
import { resolveTagIds, resolveTeamIds, resolveOwnerIds, resolveApplicationIds, resolveUnitTypeIds } from '../resolve.js';

export interface ListExperimentsParams {
  state?: string;
  type?: string;
  app?: string;
  applications?: string;
  search?: string;
  unitTypes?: string;
  owners?: string;
  teams?: string;
  tags?: string;
  ids?: string;
  impact?: string;
  confidence?: string;
  significance?: string;
  iterations?: number;
  iterationsOf?: number;
  createdAfter?: string;
  createdBefore?: string;
  startedAfter?: string;
  startedBefore?: string;
  stoppedAfter?: string;
  stoppedBefore?: string;
  analysisType?: string;
  runningType?: string;
  alertSrm?: unknown;
  alertCleanupNeeded?: unknown;
  alertAudienceMismatch?: unknown;
  alertSampleSizeReached?: unknown;
  alertExperimentsInteract?: unknown;
  alertGroupSequentialUpdated?: unknown;
  alertAssignmentConflict?: unknown;
  alertMetricThresholdReached?: unknown;
  items: number;
  page: number;
  sort?: string;
  asc?: boolean;
  desc?: boolean;
  show?: string[];
  exclude?: string[];
  raw?: boolean;
}

export async function listExperiments(
  client: APIClient,
  params: ListExperimentsParams,
): Promise<CommandResult<unknown[]>> {
  const alertFlag = (v: unknown): number | undefined => {
    if (v === undefined) return undefined;
    if (v === true) return 1;
    return v === '0' ? 0 : 1;
  };

  const createdAfter = parseDateFlagOrUndefined(params.createdAfter);
  const createdBefore = parseDateFlagOrUndefined(params.createdBefore);
  const startedAfter = parseDateFlagOrUndefined(params.startedAfter);
  const startedBefore = parseDateFlagOrUndefined(params.startedBefore);
  const stoppedAfter = parseDateFlagOrUndefined(params.stoppedAfter);
  const stoppedBefore = parseDateFlagOrUndefined(params.stoppedBefore);

  const tags = params.tags ? await resolveTagIds(client, params.tags) : undefined;
  const teams = params.teams ? await resolveTeamIds(client, params.teams) : undefined;
  const owners = params.owners ? await resolveOwnerIds(client, params.owners) : undefined;
  const applications = params.applications ? await resolveApplicationIds(client, params.applications) : undefined;
  const unitTypes = params.unitTypes ? await resolveUnitTypeIds(client, params.unitTypes) : undefined;

  const listOptions = {
    page: params.page,
    items: params.items,
    previews: true,
    ...(params.sort && { sort: params.sort }),
    ...(params.asc && { ascending: true }),
    ...(params.desc && { ascending: false }),
    ...(params.app && { application: params.app }),
    ...(applications && { applications }),
    ...(params.state && { state: params.state }),
    ...(params.type && { type: params.type }),
    ...(params.search && { search: params.search }),
    ...(unitTypes && { unit_types: unitTypes }),
    ...(owners && { owners }),
    ...(teams && { teams }),
    ...(tags && { tags }),
    ...(params.ids && { ids: params.ids }),
    ...(params.impact && { impact: params.impact }),
    ...(params.confidence && { confidence: params.confidence }),
    ...(params.iterations !== undefined && { iterations: params.iterations }),
    ...(params.iterationsOf !== undefined && { iterations_of: params.iterationsOf }),
    ...(createdAfter !== undefined && { created_after: createdAfter }),
    ...(createdBefore !== undefined && { created_before: createdBefore }),
    ...(startedAfter !== undefined && { started_after: startedAfter }),
    ...(startedBefore !== undefined && { started_before: startedBefore }),
    ...(stoppedAfter !== undefined && { stopped_after: stoppedAfter }),
    ...(stoppedBefore !== undefined && { stopped_before: stoppedBefore }),
    ...(params.analysisType && { analysis_type: params.analysisType }),
    ...(params.runningType && { running_type: params.runningType }),
    ...(alertFlag(params.alertSrm) !== undefined && { alert_srm: alertFlag(params.alertSrm)! }),
    ...(alertFlag(params.alertCleanupNeeded) !== undefined && { alert_cleanup_needed: alertFlag(params.alertCleanupNeeded)! }),
    ...(alertFlag(params.alertAudienceMismatch) !== undefined && { alert_audience_mismatch: alertFlag(params.alertAudienceMismatch)! }),
    ...(alertFlag(params.alertSampleSizeReached) !== undefined && { alert_sample_size_reached: alertFlag(params.alertSampleSizeReached)! }),
    ...(alertFlag(params.alertExperimentsInteract) !== undefined && { alert_experiments_interact: alertFlag(params.alertExperimentsInteract)! }),
    ...(alertFlag(params.alertGroupSequentialUpdated) !== undefined && { alert_group_sequential_updated: alertFlag(params.alertGroupSequentialUpdated)! }),
    ...(alertFlag(params.alertAssignmentConflict) !== undefined && { alert_assignment_conflict: alertFlag(params.alertAssignmentConflict)! }),
    ...(alertFlag(params.alertMetricThresholdReached) !== undefined && { alert_metric_threshold_reached: alertFlag(params.alertMetricThresholdReached)! }),
    ...(params.significance && { significance: params.significance }),
  } as ListOptions;

  const experiments = await client.listExperiments(listOptions);

  const extraFields = params.show ?? [];
  const excludeFields = params.exclude ?? [];

  const rows = params.raw
    ? experiments as unknown[]
    : (experiments as Array<Record<string, unknown>>).map(e => summarizeExperimentRow(e, extraFields, excludeFields));

  return {
    data: experiments as unknown[],
    rows: rows as Record<string, unknown>[],
    pagination: {
      page: params.page,
      items: params.items,
      hasMore: experiments.length >= params.items,
    },
  };
}
