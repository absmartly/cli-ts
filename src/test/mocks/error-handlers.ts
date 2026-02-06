import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://api.absmartly.com/v1';

export const errorHandlers = [
  http.post(`${BASE_URL}/experiments`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body.name) {
      return HttpResponse.json(
        { error: 'Validation failed', message: 'name is required' },
        { status: 400 }
      );
    }

    if (body.name === 'duplicate_name') {
      return HttpResponse.json(
        { error: 'Duplicate', message: 'Experiment with this name already exists' },
        { status: 409 }
      );
    }

    if (!body.unit_type_id && !body.unit_type) {
      return HttpResponse.json(
        { error: 'Validation failed', message: 'unit_type_id is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      id: Math.floor(Math.random() * 10000),
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post(`${BASE_URL}/experiments/:id/start`, ({ params }) => {
    const id = parseInt(params.id as string);

    if (id === 999) {
      return HttpResponse.json(
        { error: 'Invalid state', message: 'Experiment is already running' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ id, state: 'running' });
  }),

  http.post(`${BASE_URL}/experiments/:id/stop`, ({ params }) => {
    const id = parseInt(params.id as string);

    if (id === 888) {
      return HttpResponse.json(
        { error: 'Invalid state', message: 'Experiment is not running' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ id, state: 'stopped' });
  }),

  http.delete(`${BASE_URL}/experiments/:id`, ({ params }) => {
    const id = parseInt(params.id as string);

    if (id === 777) {
      return HttpResponse.json(
        { error: 'Cannot delete', message: 'Experiment is currently running' },
        { status: 409 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE_URL}/goals`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body.name) {
      return HttpResponse.json(
        { error: 'Validation failed', message: 'name is required' },
        { status: 400 }
      );
    }

    if (body.name === 'duplicate') {
      return HttpResponse.json(
        { error: 'Duplicate', message: 'Goal with this name already exists' },
        { status: 409 }
      );
    }

    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post(`${BASE_URL}/segments`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body.name) {
      return HttpResponse.json(
        { error: 'Validation failed', message: 'name is required' },
        { status: 400 }
      );
    }

    if (!body.value_source_attribute) {
      return HttpResponse.json(
        { error: 'Validation failed', message: 'value_source_attribute is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.delete(`${BASE_URL}/segments/:id`, ({ params }) => {
    const id = parseInt(params.id as string);

    if (id === 666) {
      return HttpResponse.json(
        { error: 'Cannot delete', message: 'Segment is in use by active experiments' },
        { status: 409 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE_URL}/api_keys`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body.name) {
      return HttpResponse.json(
        { error: 'Validation failed', message: 'name is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      key: 'abs_' + Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];
