import { http, HttpResponse } from 'msw';

export function createStatefulExperimentHandlers(baseUrl: string) {
  const store = new Map<number, Record<string, unknown>>();
  let nextId = 90000;

  return [
    http.post(`${baseUrl}/experiments`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const id = nextId++;
      const experiment = {
        ...body,
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        state: 'created',
      };
      store.set(id, experiment);
      return HttpResponse.json({ ok: true, experiment });
    }),
    http.get(`${baseUrl}/experiments/:experimentId`, ({ params }) => {
      const raw = params.experimentId as string;
      const id = Number(raw);
      const experiment = store.get(id);
      if (!experiment) {
        return HttpResponse.json(
          { ok: false, error: `Not found: experiment ${id}` },
          { status: 404 }
        );
      }
      return HttpResponse.json({ ok: true, experiment });
    }),
    http.put(`${baseUrl}/experiments/:experimentId`, async ({ params, request }) => {
      const id = Number(params.experimentId);
      const body = (await request.json()) as Record<string, unknown>;
      const existing = store.get(id);
      if (!existing) {
        return HttpResponse.json(
          { ok: false, error: `Not found: experiment ${id}` },
          { status: 404 }
        );
      }
      const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
      store.set(id, updated);
      return HttpResponse.json({ ok: true, experiment: updated, errors: [] });
    }),
    http.put(`${baseUrl}/experiments/:experimentId/archive`, async ({ params }) => {
      const id = Number(params.experimentId);
      const existing = store.get(id);
      if (existing) {
        existing.archived = true;
        existing.state = 'archived';
      }
      return HttpResponse.json({
        ok: true,
        experiment: existing ?? { id, archived: true },
        errors: [],
      });
    }),
    http.put(`${baseUrl}/experiments/:experimentId/development`, async ({ params }) => {
      const id = Number(params.experimentId);
      const existing = store.get(id);
      if (existing) existing.state = 'development';
      return HttpResponse.json({
        ok: true,
        experiment: existing ?? { id, state: 'development' },
        errors: [],
      });
    }),
    http.put(`${baseUrl}/experiments/:experimentId/start`, async ({ params }) => {
      const id = Number(params.experimentId);
      const existing = store.get(id);
      if (existing) existing.state = 'running';
      return HttpResponse.json({
        ok: true,
        experiment: existing ?? { id, state: 'running' },
        errors: [],
      });
    }),
    http.put(`${baseUrl}/experiments/:experimentId/stop`, async ({ params }) => {
      const id = Number(params.experimentId);
      const existing = store.get(id);
      if (existing) existing.state = 'stopped';
      return HttpResponse.json({
        ok: true,
        experiment: existing ?? { id, state: 'stopped' },
        errors: [],
      });
    }),
    http.put(`${baseUrl}/experiments/:experimentId/restart`, async ({ params }) => {
      const id = Number(params.experimentId);
      const existing = store.get(id);
      if (existing) existing.state = 'running';
      return HttpResponse.json({
        ok: true,
        experiment: existing ?? { id, state: 'running' },
        errors: [],
      });
    }),
  ];
}
