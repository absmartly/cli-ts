import { describe, it, expect, beforeAll } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadOpenAPISpec,
  getSchemaForEndpoint,
  validateAgainstSchema,
} from 'absmartly-api-mocks/validation';
import {
  createMockExperiment,
  createMockExperiments,
  createMockGoals,
  createMockSegments,
  createMockTeams,
  createMockUsers,
  createMockMetrics,
  createMockApplications,
  createMockEnvironments,
  createMockUnitTypes,
  createMockExperimentTags,
  createMockGoalTags,
  createMockMetricTags,
  createMockMetricCategories,
  createMockRoles,
  createMockPermissions,
  createMockApiKeys,
  createMockWebhooks,
} from 'absmartly-api-mocks/factories';

const validationEntry = fileURLToPath(import.meta.resolve('absmartly-api-mocks/validation'));
const mocksDir = resolve(dirname(validationEntry), '..', '..');
const specPath = resolve(mocksDir, 'openapi/openapi.bundle.yaml');

interface ValidationError {
  instancePath?: string;
  message?: string;
}

async function expectSchemaValid(
  endpointPath: string,
  method: string,
  data: unknown,
  statusCode: number | string = 200,
) {
  const schema = await getSchemaForEndpoint(endpointPath, method, statusCode);
  expect(schema, `No schema found for ${method.toUpperCase()} ${endpointPath} ${statusCode}`).not.toBeNull();
  const result = await validateAgainstSchema(data, schema!);
  if (!result.valid) {
    const errors = (result.errors as ValidationError[] | null)
      ?.map(e => `${e.instancePath || '/'}: ${e.message}`)
      .join('\n');
    expect.fail(`Schema validation failed for ${method.toUpperCase()} ${endpointPath}:\n${errors}`);
  }
}

function paginatedResponse<T>(key: string, items: T[]) {
  return {
    [key]: items,
    items: 25,
    page: 1,
    total: items.length,
  };
}

describe('API contract validation', () => {
  beforeAll(async () => {
    await loadOpenAPISpec(specPath);
  });

  describe('experiments', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('experiments', createMockExperiments(3));
      await expectSchemaValid('/experiments', 'get', data);
    });

    it('detail response matches OpenAPI spec', async () => {
      const data = {
        experiment: createMockExperiment(),
        experiment_template_permissions: null,
      };
      await expectSchemaValid('/experiments/{experimentId}', 'get', data);
    });
  });

  describe('goals', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('goals', createMockGoals(3));
      await expectSchemaValid('/goals', 'get', data);
    });
  });

  describe('segments', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('segments', createMockSegments(3));
      await expectSchemaValid('/segments', 'get', data);
    });
  });

  describe('teams', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('teams', createMockTeams(3));
      await expectSchemaValid('/teams', 'get', data);
    });
  });

  describe('users', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('users', createMockUsers(3));
      await expectSchemaValid('/users', 'get', data);
    });
  });

  describe('metrics', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('metrics', createMockMetrics(3));
      await expectSchemaValid('/metrics', 'get', data);
    });
  });

  describe('applications', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('applications', createMockApplications(3));
      await expectSchemaValid('/applications', 'get', data);
    });
  });

  describe('environments', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('environments', createMockEnvironments(3));
      await expectSchemaValid('/environments', 'get', data);
    });
  });

  describe('unit_types', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('unit_types', createMockUnitTypes(3));
      await expectSchemaValid('/unit_types', 'get', data);
    });
  });

  describe('experiment_tags', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = {
        ...paginatedResponse('experiment_tags', createMockExperimentTags(3)),
        ok: true,
        errors: [],
      };
      await expectSchemaValid('/experiment_tags', 'get', data);
    });
  });

  describe('goal_tags', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('goal_tags', createMockGoalTags(3));
      await expectSchemaValid('/goal_tags', 'get', data);
    });
  });

  describe('metric_tags', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('metric_tags', createMockMetricTags(3));
      await expectSchemaValid('/metric_tags', 'get', data);
    });
  });

  describe('metric_categories', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('metric_categories', createMockMetricCategories(3));
      await expectSchemaValid('/metric_categories', 'get', data);
    });
  });

  describe('roles', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('roles', createMockRoles(3));
      await expectSchemaValid('/roles', 'get', data);
    });
  });

  describe('permissions', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = { permissions: createMockPermissions(3) };
      await expectSchemaValid('/permissions', 'get', data);
    });
  });

  describe('api_keys', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = {
        ...paginatedResponse('api_keys', createMockApiKeys(3)),
        errors: [],
      };
      await expectSchemaValid('/api_keys', 'get', data);
    });
  });

  describe('webhooks', () => {
    it('list response matches OpenAPI spec', async () => {
      const data = paginatedResponse('webhooks', createMockWebhooks(3));
      await expectSchemaValid('/webhooks', 'get', data);
    });
  });
});
