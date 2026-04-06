import type { APIClient } from '../api-client/api-client.js';
import { parseCSV } from '../api-client/payload/parse-csv.js';

function allNumeric(refs: string[]): boolean {
  return refs.every(r => !isNaN(parseInt(r, 10)) && String(parseInt(r, 10)) === r.trim());
}

export async function resolveTagIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveTags(refs);
  return resolved.map(t => t.id).join(',');
}

export async function resolveTeamIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveTeams(refs);
  return resolved.map(t => t.id).join(',');
}

export async function resolveOwnerIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveUsers(refs);
  return resolved.map(u => u.id).join(',');
}

export async function resolveApplicationIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveApplications(refs);
  return resolved.map(a => a.id).join(',');
}

export async function resolveUnitTypeIds(client: APIClient, raw: string): Promise<string> {
  const refs = parseCSV(raw);
  if (allNumeric(refs)) return refs.join(',');
  const resolved = await client.resolveUnitTypes(refs);
  return resolved.map(u => u.id).join(',');
}
