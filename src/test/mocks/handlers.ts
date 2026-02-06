import { http, HttpResponse } from 'msw';
import { createMockExperiments, createMockGoals, createMockSegments, createMockTeams, createMockUsers, createMockMetrics, createMockApplications, createMockEnvironments, createMockUnitTypes, createMockExperimentTags, createMockGoalTags, createMockMetricTags, createMockMetricCategories, createMockRoles, createMockPermissions, createMockApiKeys, createMockWebhooks, createMockAlerts, createMockNotes } from './factories.js';

const BASE_URL = 'https://api.absmartly.com/v1';

export const handlers = [
  http.get(`${BASE_URL}/experiments`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const experiments = createMockExperiments(limit);
    return HttpResponse.json({ experiments });
  }),

  http.get(`${BASE_URL}/experiments/:id`, ({ params }) => {
    const { id } = params;
    const experiments = createMockExperiments(1);
    const experiment = { ...experiments[0], id: parseInt(id as string) };
    return HttpResponse.json(experiment);
  }),

  http.post(`${BASE_URL}/experiments`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const experiment = {
      id: Math.floor(Math.random() * 10000),
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(experiment, { status: 201 });
  }),

  http.put(`${BASE_URL}/experiments/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;
    const experiment = {
      id: parseInt(id as string),
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(experiment);
  }),

  http.delete(`${BASE_URL}/experiments/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE_URL}/experiments/:id/start`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id: parseInt(id as string), state: 'running' });
  }),

  http.post(`${BASE_URL}/experiments/:id/stop`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id: parseInt(id as string), state: 'stopped' });
  }),

  http.post(`${BASE_URL}/experiments/:id/archive`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id: parseInt(id as string), state: 'archived' });
  }),

  http.get(`${BASE_URL}/experiments/:id/alerts`, () => {
    const alerts = createMockAlerts(3);
    return HttpResponse.json({ alerts });
  }),

  http.delete(`${BASE_URL}/experiments/:id/alerts`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/experiments/:id/notes`, () => {
    const notes = createMockNotes(5);
    return HttpResponse.json({ notes });
  }),

  http.post(`${BASE_URL}/experiments/:id/notes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      text: body.text,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.get(`${BASE_URL}/goals`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const goals = createMockGoals(limit);
    return HttpResponse.json({ goals });
  }),

  http.get(`${BASE_URL}/goals/:id`, ({ params }) => {
    const goals = createMockGoals(1);
    return HttpResponse.json({ ...goals[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/goals`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Math.floor(Math.random() * 1000), ...body }, { status: 201 });
  }),

  http.put(`${BASE_URL}/goals/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.delete(`${BASE_URL}/goals/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/segments`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const segments = createMockSegments(limit);
    return HttpResponse.json({ segments });
  }),

  http.get(`${BASE_URL}/segments/:id`, ({ params }) => {
    const segments = createMockSegments(1);
    return HttpResponse.json({ ...segments[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/segments`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Math.floor(Math.random() * 1000), ...body }, { status: 201 });
  }),

  http.put(`${BASE_URL}/segments/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.delete(`${BASE_URL}/segments/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/teams`, () => {
    const teams = createMockTeams(10);
    return HttpResponse.json({ teams });
  }),

  http.get(`${BASE_URL}/teams/:id`, ({ params }) => {
    const teams = createMockTeams(1);
    return HttpResponse.json({ ...teams[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/teams`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Math.floor(Math.random() * 1000), ...body }, { status: 201 });
  }),

  http.put(`${BASE_URL}/teams/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.post(`${BASE_URL}/teams/:id/archive`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id as string), archived: true });
  }),

  http.post(`${BASE_URL}/teams/:id/unarchive`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id as string), archived: false });
  }),

  http.get(`${BASE_URL}/users`, () => {
    const users = createMockUsers(10);
    return HttpResponse.json({ users });
  }),

  http.get(`${BASE_URL}/users/:id`, ({ params }) => {
    const users = createMockUsers(1);
    return HttpResponse.json({ ...users[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Math.floor(Math.random() * 1000), ...body }, { status: 201 });
  }),

  http.put(`${BASE_URL}/users/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.post(`${BASE_URL}/users/:id/archive`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id as string), archived: true });
  }),

  http.get(`${BASE_URL}/metrics`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const metrics = createMockMetrics(limit);
    return HttpResponse.json({ metrics });
  }),

  http.get(`${BASE_URL}/metrics/:id`, ({ params }) => {
    const metrics = createMockMetrics(1);
    return HttpResponse.json({ ...metrics[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/metrics`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Math.floor(Math.random() * 1000), ...body }, { status: 201 });
  }),

  http.put(`${BASE_URL}/metrics/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.post(`${BASE_URL}/metrics/:id/archive`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id as string), archived: true });
  }),

  http.get(`${BASE_URL}/applications`, () => {
    const applications = createMockApplications(5);
    return HttpResponse.json({ applications });
  }),

  http.get(`${BASE_URL}/applications/:id`, ({ params }) => {
    const applications = createMockApplications(1);
    return HttpResponse.json({ ...applications[0], id: parseInt(params.id as string) });
  }),

  http.get(`${BASE_URL}/environments`, () => {
    const environments = createMockEnvironments(3);
    return HttpResponse.json({ environments });
  }),

  http.get(`${BASE_URL}/environments/:id`, ({ params }) => {
    const environments = createMockEnvironments(1);
    return HttpResponse.json({ ...environments[0], id: parseInt(params.id as string) });
  }),

  http.get(`${BASE_URL}/unit-types`, () => {
    const unit_types = createMockUnitTypes(5);
    return HttpResponse.json({ unit_types });
  }),

  http.get(`${BASE_URL}/unit-types/:id`, ({ params }) => {
    const unit_types = createMockUnitTypes(1);
    return HttpResponse.json({ ...unit_types[0], id: parseInt(params.id as string) });
  }),

  http.get(`${BASE_URL}/experiment_tags`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const experiment_tags = createMockExperimentTags(limit);
    return HttpResponse.json({ experiment_tags });
  }),

  http.get(`${BASE_URL}/experiment_tags/:id`, ({ params }) => {
    const experiment_tags = createMockExperimentTags(1);
    return HttpResponse.json({ experiment_tag: { ...experiment_tags[0], id: parseInt(params.id as string) } });
  }),

  http.post(`${BASE_URL}/experiment_tags`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ experiment_tag: { id: Math.floor(Math.random() * 1000), ...body } }, { status: 201 });
  }),

  http.put(`${BASE_URL}/experiment_tags/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ experiment_tag: { id: parseInt(params.id as string), ...body } });
  }),

  http.delete(`${BASE_URL}/experiment_tags/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/goal_tags`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const goal_tags = createMockGoalTags(limit);
    return HttpResponse.json({ goal_tags });
  }),

  http.get(`${BASE_URL}/goal_tags/:id`, ({ params }) => {
    const goal_tags = createMockGoalTags(1);
    return HttpResponse.json({ goal_tag: { ...goal_tags[0], id: parseInt(params.id as string) } });
  }),

  http.post(`${BASE_URL}/goal_tags`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ goal_tag: { id: Math.floor(Math.random() * 1000), ...body } }, { status: 201 });
  }),

  http.put(`${BASE_URL}/goal_tags/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ goal_tag: { id: parseInt(params.id as string), ...body } });
  }),

  http.delete(`${BASE_URL}/goal_tags/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/metric_tags`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const metric_tags = createMockMetricTags(limit);
    return HttpResponse.json({ metric_tags });
  }),

  http.get(`${BASE_URL}/metric_tags/:id`, ({ params }) => {
    const metric_tags = createMockMetricTags(1);
    return HttpResponse.json({ metric_tag: { ...metric_tags[0], id: parseInt(params.id as string) } });
  }),

  http.post(`${BASE_URL}/metric_tags`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ metric_tag: { id: Math.floor(Math.random() * 1000), ...body } }, { status: 201 });
  }),

  http.put(`${BASE_URL}/metric_tags/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ metric_tag: { id: parseInt(params.id as string), ...body } });
  }),

  http.delete(`${BASE_URL}/metric_tags/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/metric_categories`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const metric_categories = createMockMetricCategories(limit);
    return HttpResponse.json({ metric_categories });
  }),

  http.get(`${BASE_URL}/metric_categories/:id`, ({ params }) => {
    const metric_categories = createMockMetricCategories(1);
    return HttpResponse.json({ metric_category: { ...metric_categories[0], id: parseInt(params.id as string) } });
  }),

  http.post(`${BASE_URL}/metric_categories`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ metric_category: { id: Math.floor(Math.random() * 1000), ...body } }, { status: 201 });
  }),

  http.put(`${BASE_URL}/metric_categories/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ metric_category: { id: parseInt(params.id as string), ...body } });
  }),

  http.put(`${BASE_URL}/metric_categories/:id/archive`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id as string), archived: true });
  }),

  http.get(`${BASE_URL}/roles`, () => {
    const roles = createMockRoles(5);
    return HttpResponse.json({ roles });
  }),

  http.get(`${BASE_URL}/roles/:id`, ({ params }) => {
    const roles = createMockRoles(1);
    return HttpResponse.json({ ...roles[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/roles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Math.floor(Math.random() * 1000), ...body }, { status: 201 });
  }),

  http.put(`${BASE_URL}/roles/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.delete(`${BASE_URL}/roles/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/permissions`, () => {
    const permissions = createMockPermissions(20);
    return HttpResponse.json({ permissions });
  }),

  http.get(`${BASE_URL}/permission_categories`, () => {
    const categories = [
      { id: 1, name: 'Experiments', permissions: createMockPermissions(5) },
      { id: 2, name: 'Users', permissions: createMockPermissions(3) },
    ];
    return HttpResponse.json({ permission_categories: categories });
  }),

  http.get(`${BASE_URL}/api_keys`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const api_keys = createMockApiKeys(limit);
    return HttpResponse.json({ api_keys });
  }),

  http.get(`${BASE_URL}/api_keys/:id`, ({ params }) => {
    const api_keys = createMockApiKeys(1);
    return HttpResponse.json({ ...api_keys[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/api_keys`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const apiKey = {
      id: Math.floor(Math.random() * 1000),
      ...body,
      key: 'abs_' + Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(apiKey, { status: 201 });
  }),

  http.put(`${BASE_URL}/api_keys/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.delete(`${BASE_URL}/api_keys/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE_URL}/webhooks`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const webhooks = createMockWebhooks(limit);
    return HttpResponse.json({ webhooks });
  }),

  http.get(`${BASE_URL}/webhooks/:id`, ({ params }) => {
    const webhooks = createMockWebhooks(1);
    return HttpResponse.json({ ...webhooks[0], id: parseInt(params.id as string) });
  }),

  http.post(`${BASE_URL}/webhooks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Math.floor(Math.random() * 1000), ...body }, { status: 201 });
  }),

  http.put(`${BASE_URL}/webhooks/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: parseInt(params.id as string), ...body });
  }),

  http.delete(`${BASE_URL}/webhooks/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
