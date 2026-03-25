export function applyShowExclude(
  summary: Record<string, unknown>,
  raw: Record<string, unknown>,
  extraFields: string[] = [],
  excludeFields: string[] = [],
): Record<string, unknown> {
  for (const field of extraFields) {
    if (!(field in summary) && field in raw) {
      summary[field] = raw[field];
    }
  }
  if (excludeFields.length > 0) {
    for (const field of excludeFields) delete summary[field];
  }
  return summary;
}

function formatOwner(obj: Record<string, unknown> | undefined): string {
  if (!obj) return '';
  const first = obj.first_name as string ?? '';
  const last = obj.last_name as string ?? '';
  return [first, last].filter(Boolean).join(' ') || (obj.email as string) || '';
}

import { formatDate } from './format-helpers.js';

export function summarizeMetric(m: Record<string, unknown>): Record<string, unknown> {
  const goal = m.goal as Record<string, unknown> | undefined;
  const category = m.metric_category as Record<string, unknown> | undefined;
  const tags = m.tags as Array<Record<string, unknown>> | undefined;
  const owners = m.owners as Array<Record<string, unknown>> | undefined;

  return {
    id: m.id,
    name: m.name,
    type: m.type,
    effect: m.effect ?? '',
    status: m.lifecycle_status ?? '',
    goal: goal?.name ?? m.goal_id ?? '',
    category: category?.name ?? '',
    description: m.description ?? '',
    owners: owners?.map(o => formatOwner(o.user as Record<string, unknown>)).join(', ') ?? '',
    tags: tags?.map(t => (t.metric_tag as Record<string, unknown>)?.tag ?? '').filter(Boolean).join(', ') ?? '',
    created_at: formatDate(m.created_at),
    updated_at: formatDate(m.updated_at),
  };
}

export function summarizeMetricRow(m: Record<string, unknown>): Record<string, unknown> {
  const goal = m.goal as Record<string, unknown> | undefined;
  const category = m.metric_category as Record<string, unknown> | undefined;

  return {
    id: m.id,
    name: m.name,
    type: m.type,
    effect: m.effect ?? '',
    status: m.lifecycle_status ?? '',
    goal: goal?.name ?? m.goal_id ?? '',
    category: category?.name ?? '',
  };
}

export function summarizeGoal(g: Record<string, unknown>): Record<string, unknown> {
  const tags = g.tags as Array<Record<string, unknown>> | undefined;
  const createdBy = g.created_by as Record<string, unknown> | undefined;

  return {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    tags: tags?.map(t => (t.goal_tag as Record<string, unknown>)?.tag ?? '').filter(Boolean).join(', ') ?? '',
    created_by: formatOwner(createdBy),
    created_at: formatDate(g.created_at),
    updated_at: formatDate(g.updated_at),
    archived: g.archived ?? false,
  };
}

export function summarizeGoalRow(g: Record<string, unknown>): Record<string, unknown> {
  const tags = g.tags as Array<Record<string, unknown>> | undefined;

  return {
    id: g.id,
    name: g.name,
    tags: tags?.map(t => (t.goal_tag as Record<string, unknown>)?.tag ?? '').filter(Boolean).join(', ') ?? '',
    archived: g.archived ?? false,
  };
}

export function summarizeTeam(t: Record<string, unknown>): Record<string, unknown> {
  const parentTeam = t.parent_team as Record<string, unknown> | undefined;
  const createdBy = t.created_by as Record<string, unknown> | undefined;

  return {
    id: t.id,
    name: t.name,
    initials: t.initials ?? '',
    description: t.description ?? '',
    parent: parentTeam?.name ?? t.parent_team_id ?? '',
    created_by: formatOwner(createdBy),
    created_at: formatDate(t.created_at),
    archived: t.archived ?? false,
  };
}

export function summarizeTeamRow(t: Record<string, unknown>): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    initials: t.initials ?? '',
    description: t.description ?? '',
    archived: t.archived ?? false,
  };
}

export function summarizeUserRow(u: Record<string, unknown>): Record<string, unknown> {
  return {
    id: u.id,
    email: u.email,
    name: [u.first_name, u.last_name].filter(Boolean).join(' '),
    department: u.department ?? '',
    job_title: u.job_title ?? '',
    archived: u.archived ?? false,
    last_login: formatDate(u.last_login_at),
  };
}

export function summarizeUserDetail(u: Record<string, unknown>): Record<string, unknown> {
  return {
    id: u.id,
    email: u.email,
    name: [u.first_name, u.last_name].filter(Boolean).join(' '),
    department: u.department ?? '',
    job_title: u.job_title ?? '',
    archived: u.archived ?? false,
    last_login: formatDate(u.last_login_at),
    created_at: formatDate(u.created_at),
    updated_at: formatDate(u.updated_at),
  };
}

export function summarizeSegment(s: Record<string, unknown>): Record<string, unknown> {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? '',
    attribute: s.attribute ?? '',
    created_at: formatDate(s.created_at),
    archived: s.archived ?? false,
  };
}

export function summarizeSegmentRow(s: Record<string, unknown>): Record<string, unknown> {
  return {
    id: s.id,
    name: s.name,
    attribute: s.attribute ?? '',
    archived: s.archived ?? false,
  };
}
