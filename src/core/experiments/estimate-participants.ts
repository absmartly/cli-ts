import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { parseDateFlag } from '../../lib/utils/date-parser.js';
import { resolveByName } from '../../api-client/payload/resolver.js';

export interface EstimateParticipantsParams {
  unitType: string;
  application?: string[];
  from?: string;
  audience?: string;
}

export interface EstimateParticipantsRow {
  unitCount?: number;
  firstExposure?: number;
  lastExposure?: number;
}

export interface EstimateParticipantsData {
  raw: unknown;
  rows: EstimateParticipantsRow[];
  fromTimestamp: number;
  columnNames: string[];
}

export async function estimateParticipants(
  client: APIClient,
  params: EstimateParticipantsParams
): Promise<CommandResult<EstimateParticipantsData>> {
  const from = parseDateFlag(params.from ?? '30d');
  const applicationNamesOrIds: string[] = params.application ?? [];

  if (params.audience) {
    try {
      JSON.parse(params.audience);
    } catch {
      throw new Error(
        `Invalid JSON in --audience: ${params.audience}\n` +
          `Expected valid JSON, e.g.: --audience '{"filter":{"and":[...]}}'`
      );
    }
  }

  const needsApplications = applicationNamesOrIds.length > 0;
  const [applications, unitTypes] = await Promise.all([
    needsApplications ? client.listApplications() : Promise.resolve([]),
    client.listUnitTypes(),
  ]);

  const unitType = resolveByName(unitTypes, params.unitType, 'Unit type');
  const applicationIds = applicationNamesOrIds.map(
    (nameOrId) => resolveByName(applications, nameOrId, 'Application').id
  );

  const apiParams: {
    from: number;
    unit_type_id: number;
    applications?: number[];
    audience?: string;
  } = {
    from,
    unit_type_id: unitType.id,
  };

  if (applicationIds.length > 0) apiParams.applications = applicationIds;
  if (params.audience) apiParams.audience = params.audience;

  const result = await client.estimateMaxParticipants(apiParams);

  const colIndex = (name: string) => result.columnNames.indexOf(name);
  const unitCountIdx = colIndex('unit_count');
  const firstExposureIdx = colIndex('first_exposure_at');
  const lastExposureIdx = colIndex('last_exposure_at');

  const parsedRows: EstimateParticipantsRow[] = result.rows.map((row: unknown[]) => ({
    ...(unitCountIdx >= 0 && { unitCount: row[unitCountIdx] as number }),
    ...(firstExposureIdx >= 0 && { firstExposure: row[firstExposureIdx] as number }),
    ...(lastExposureIdx >= 0 && { lastExposure: row[lastExposureIdx] as number }),
  }));

  return {
    data: {
      raw: result,
      rows: parsedRows,
      fromTimestamp: from,
      columnNames: result.columnNames,
    },
    warnings: unitCountIdx < 0 ? ['"unit_count" not present in API response'] : undefined,
  };
}
