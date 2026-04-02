import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TeamId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeTeam } from '../../api-client/entity-summary.js';

export interface GetTeamParams {
  id: TeamId;
  show?: string[] | undefined;
  exclude?: string[] | undefined;
  raw?: boolean | undefined;
}

export async function getTeam(
  client: APIClient,
  params: GetTeamParams
): Promise<CommandResult<unknown>> {
  const team = await client.getTeam(params.id);
  const show = params.show ?? [];
  const exclude = params.exclude ?? [];

  const data = params.raw
    ? team
    : applyShowExclude(
        summarizeTeam(team as Record<string, unknown>),
        team as Record<string, unknown>,
        show,
        exclude
      );
  return { data };
}
