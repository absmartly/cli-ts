import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { version } from '../utils/version.js';
import type {
  Experiment,
  ListOptions,
  Goal,
  Segment,
  Team,
  User,
  Metric,
  Application,
  Environment,
  UnitType,
  APIError,
  Note,
  ExperimentTag,
  GoalTag,
  MetricTag,
  MetricCategory,
  Role,
  Permission,
  PermissionCategory,
  ApiKey,
  Webhook,
} from './types.js';
import type {
  ExperimentId,
  GoalId,
  SegmentId,
  TeamId,
  UserId,
  MetricId,
  ApplicationId,
  EnvironmentId,
  UnitTypeId,
  TagId,
  RoleId,
  ApiKeyId,
  WebhookId,
  ScheduledActionId,
} from './branded-types.js';

export interface ClientOptions {
  verbose?: boolean;
  timeout?: number;
}

export class APIClient {
  private client: AxiosInstance;
  private verbose: boolean;

  constructor(endpoint: string, apiKey: string, options: ClientOptions = {}) {
    this.verbose = options.verbose ?? false;

    this.client = axios.create({
      baseURL: endpoint,
      timeout: options.timeout ?? 30000,
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `absmartly-cli/${version}`,
      },
    });

    const NON_IDEMPOTENT_PUT_PATHS = [
      '/start', '/stop', '/restart', '/development', '/full_on',
    ];

    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error: AxiosError) => {
        const method = error.config?.method?.toUpperCase();
        const url = error.config?.url ?? '';

        if (method === 'PUT' && NON_IDEMPOTENT_PUT_PATHS.some((p) => url.endsWith(p))) {
          return false;
        }

        const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method ?? '');
        if (!isIdempotent) return false;

        if (axiosRetry.isNetworkError(error)) return true;

        return (error.response?.status ?? 0) >= 500;
      },
    });

    if (this.verbose) {
      this.client.interceptors.request.use((config) => {
        console.error(`[DEBUG] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      });
    }

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleError(error);
      }
    );
  }

  private handleError(error: AxiosError): APIError {
    const apiError: APIError = new Error('API error');
    if (error.response?.status !== undefined) {
      apiError.statusCode = error.response.status;
    }
    if (error.response?.data !== undefined) {
      apiError.response = error.response.data;
    }

    const endpoint = error.config?.url || 'unknown endpoint';
    const method = error.config?.method?.toUpperCase() || 'unknown method';
    const status = error.response?.status;

    switch (status) {
      case 401:
        apiError.message =
          `Unauthorized: Invalid or expired API key.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          `Run: abs auth login --api-key YOUR_KEY`;
        break;
      case 403:
        apiError.message =
          `Forbidden: Insufficient permissions for this operation.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          `Please check your API key has the required permissions.`;
        break;
      case 404:
        apiError.message =
          `Not found: Resource does not exist.\n` +
          `Endpoint: ${method} ${endpoint}`;
        break;
      case 429: {
        const retryAfter = error.response?.headers['retry-after'];
        apiError.message =
          `Rate limit exceeded.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          (retryAfter ? `Retry after: ${retryAfter} seconds` : 'Please try again later.');
        break;
      }
      default:
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          apiError.message =
            `Cannot connect to API server.\n` +
            `Endpoint: ${endpoint}\n` +
            `Please check your network connection and API endpoint configuration.`;
        } else if (error.code === 'ETIMEDOUT') {
          apiError.message =
            `Request timeout.\n` +
            `Endpoint: ${method} ${endpoint}\n` +
            `The server took too long to respond. Please try again.`;
        } else {
          apiError.message =
            `API error: ${error.message || 'unknown error'}\n` +
            `Endpoint: ${method} ${endpoint}`;
        }
    }

    return apiError;
  }

  private validateListResponse<T>(
    response: AxiosResponse,
    expectedKey: string,
    operation: string
  ): T[] {
    const data = response.data;

    if (!data || typeof data !== 'object') {
      throw new Error(
        `Invalid API response for ${operation}: Expected object, got ${typeof data}\n` +
        `This may indicate an API error or network proxy issue.`
      );
    }

    const items = (data as Record<string, unknown>)[expectedKey];

    if (items === undefined) {
      throw new Error(
        `Invalid API response for ${operation}: Missing "${expectedKey}" field\n` +
        `Response keys: ${Object.keys(data).join(', ')}\n` +
        `This may indicate an API version mismatch.`
      );
    }

    if (!Array.isArray(items)) {
      throw new Error(
        `Invalid API response for ${operation}: "${expectedKey}" must be an array, got ${typeof items}`
      );
    }

    return items as T[];
  }

  private validateOkResponse(response: AxiosResponse, operation: string): void {
    const data = response.data;
    if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
      const errors: string[] = Array.isArray(data.errors) ? data.errors : [];
      const apiError: APIError = new Error(
        `${operation} failed: ${errors.join(', ') || 'unknown error'}`
      );
      apiError.statusCode = response.status;
      apiError.response = data;
      throw apiError;
    }
  }

  async listExperiments(options: ListOptions = {}): Promise<Experiment[]> {
    const params: Record<string, string> = {};

    if (options.limit !== undefined) params.limit = String(options.limit);
    if (options.offset !== undefined) params.offset = String(options.offset);
    if (options.application) params.application = options.application;
    if (options.status) params.status = options.status;
    if (options.state) params.state = options.state;
    if (options.type) params.type = options.type;
    if (options.unit_types) params.unit_types = options.unit_types;
    if (options.owners) params.owners = options.owners;
    if (options.teams) params.teams = options.teams;
    if (options.tags) params.tags = options.tags;

    if (options.created_after || options.created_before) {
      params.created_at = `${options.created_after ?? 0},${options.created_before ?? 0}`;
    }
    if (options.started_after || options.started_before) {
      params.started_at = `${options.started_after ?? 0},${options.started_before ?? 0}`;
    }
    if (options.stopped_after || options.stopped_before) {
      params.stopped_at = `${options.stopped_after ?? 0},${options.stopped_before ?? 0}`;
    }

    if (options.analysis_type) params.analysis_type = options.analysis_type;
    if (options.running_type) params.running_type = options.running_type;
    if (options.search) params.search = options.search;

    if (options.alert_srm !== undefined) params.sample_ratio_mismatch = String(options.alert_srm);
    if (options.alert_cleanup_needed !== undefined) params.cleanup_needed = String(options.alert_cleanup_needed);
    if (options.alert_audience_mismatch !== undefined)
      params.audience_mismatch = String(options.alert_audience_mismatch);
    if (options.alert_sample_size_reached !== undefined)
      params.sample_size_reached = String(options.alert_sample_size_reached);
    if (options.alert_experiments_interact !== undefined)
      params.experiments_interact = String(options.alert_experiments_interact);
    if (options.alert_group_sequential_updated !== undefined)
      params.group_sequential_updated = String(options.alert_group_sequential_updated);
    if (options.alert_assignment_conflict !== undefined)
      params.assignment_conflict = String(options.alert_assignment_conflict);
    if (options.alert_metric_threshold_reached !== undefined)
      params.metric_threshold_reached = String(options.alert_metric_threshold_reached);

    if (options.significance) params.significance = options.significance;

    const response = await this.client.get('/experiments', { params });
    return this.validateListResponse<Experiment>(response, 'experiments', 'listExperiments');
  }

  async getExperiment(id: ExperimentId): Promise<Experiment> {
    const response = await this.client.get(`/experiments/${id}`);
    return response.data.experiment;
  }

  async createExperiment(data: Partial<Experiment>): Promise<Experiment> {
    const response = await this.client.post('/experiments', data);
    this.validateOkResponse(response, 'createExperiment');
    return response.data.experiment;
  }

  async updateExperiment(id: ExperimentId, data: Partial<Experiment>): Promise<Experiment> {
    const response = await this.client.put(`/experiments/${id}`, { data });
    return response.data.experiment;
  }

  async startExperiment(id: ExperimentId): Promise<Experiment> {
    const response = await this.client.put(`/experiments/${id}/start`);
    return response.data.experiment;
  }

  async stopExperiment(id: ExperimentId, reason?: string): Promise<Experiment> {
    const response = await this.client.put(`/experiments/${id}/stop`, {
      ...(reason !== undefined && { reason }),
    });
    return response.data.experiment;
  }

  async archiveExperiment(id: ExperimentId, unarchive = false): Promise<void> {
    await this.client.put(`/experiments/${id}/archive`, { archive: !unarchive });
  }

  async developmentExperiment(id: ExperimentId, note: string): Promise<Experiment> {
    const response = await this.client.put(`/experiments/${id}/development`, { note });
    return response.data.experiment;
  }

  async restartExperiment(
    id: ExperimentId,
    options: {
      note?: string;
      reason?: string;
      reshuffle?: boolean;
      state?: 'development' | 'running';
      data?: Partial<Experiment>;
    } = {}
  ): Promise<Experiment> {
    const response = await this.client.put(`/experiments/${id}/restart`, options);
    return response.data.new_experiment ?? response.data.experiment;
  }

  async fullOnExperiment(id: ExperimentId, fullOnVariant: number, note: string): Promise<Experiment> {
    const response = await this.client.put(`/experiments/${id}/full_on`, {
      full_on_variant: fullOnVariant,
      note,
    });
    return response.data.experiment;
  }

  async createScheduledAction(
    id: ExperimentId,
    action: string,
    scheduledAt: string,
    note: string,
    reason?: string
  ): Promise<unknown> {
    const body: Record<string, unknown> = { action, scheduled_at: scheduledAt, note };
    if (reason) body.reason = reason;
    const response = await this.client.post(`/experiments/${id}/scheduled_action`, body);
    return response.data;
  }

  async deleteScheduledAction(id: ExperimentId, actionId: ScheduledActionId): Promise<void> {
    await this.client.delete(`/experiments/${id}/scheduled_action/${actionId}`);
  }

  async listExperimentActivity(id: ExperimentId): Promise<Note[]> {
    const response = await this.client.get(`/experiments/${id}/activity`);
    return this.validateListResponse<Note>(response, 'experiment_notes', 'listExperimentActivity');
  }

  async createExperimentNote(id: ExperimentId, note: string): Promise<Note> {
    const response = await this.client.post(`/experiments/${id}/activity`, { note });
    return response.data.experiment_note;
  }

  async searchExperiments(query: string, limit = 50): Promise<Experiment[]> {
    return this.listExperiments({ search: query, limit });
  }

  async listGoals(limit = 100, offset = 0): Promise<Goal[]> {
    const response = await this.client.get('/goals', {
      params: { limit, offset },
    });
    return this.validateListResponse<Goal>(response, 'goals', 'listGoals');
  }

  async getGoal(id: GoalId): Promise<Goal> {
    const response = await this.client.get(`/goals/${id}`);
    return response.data.goal;
  }

  async createGoal(data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.post('/goals', data);
    return response.data.goal;
  }

  async updateGoal(id: GoalId, data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.put(`/goals/${id}`, { data });
    return response.data.goal;
  }

  async listSegments(limit = 100, offset = 0): Promise<Segment[]> {
    const response = await this.client.get('/segments', {
      params: { limit, offset },
    });
    return this.validateListResponse<Segment>(response, 'segments', 'listSegments');
  }

  async getSegment(id: SegmentId): Promise<Segment> {
    const response = await this.client.get(`/segments/${id}`);
    return response.data.segment;
  }

  async createSegment(data: Partial<Segment>): Promise<Segment> {
    const response = await this.client.post('/segments', data);
    return response.data.segment;
  }

  async updateSegment(id: SegmentId, data: Partial<Segment>): Promise<Segment> {
    const response = await this.client.put(`/segments/${id}`, { data });
    return response.data.segment;
  }

  async deleteSegment(id: SegmentId): Promise<void> {
    await this.client.delete(`/segments/${id}`);
  }

  async listTeams(includeArchived = false): Promise<Team[]> {
    const response = await this.client.get('/teams', {
      params: { include_archived: includeArchived ? '1' : '0' },
    });
    return this.validateListResponse<Team>(response, 'teams', 'listTeams');
  }

  async getTeam(id: TeamId): Promise<Team> {
    const response = await this.client.get(`/teams/${id}`);
    return response.data.team;
  }

  async createTeam(data: Partial<Team>): Promise<Team> {
    const response = await this.client.post('/teams', data);
    return response.data.team;
  }

  async updateTeam(id: TeamId, data: Partial<Team>): Promise<Team> {
    const response = await this.client.put(`/teams/${id}`, data);
    return response.data.team;
  }

  async archiveTeam(id: TeamId, unarchive = false): Promise<void> {
    await this.client.put(`/teams/${id}/archive`, { archive: !unarchive });
  }

  async listUsers(includeArchived = false): Promise<User[]> {
    const response = await this.client.get('/users', {
      params: { include_archived: includeArchived ? '1' : '0' },
    });
    return this.validateListResponse<User>(response, 'users', 'listUsers');
  }

  async getUser(id: UserId): Promise<User> {
    const response = await this.client.get(`/users/${id}`);
    return response.data.user;
  }

  async createUser(data: Partial<User>): Promise<User> {
    const response = await this.client.post('/users', data);
    return response.data.user;
  }

  async updateUser(id: UserId, data: Partial<User>): Promise<User> {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data.user;
  }

  async archiveUser(id: UserId, unarchive = false): Promise<void> {
    await this.client.put(`/users/${id}/archive`, { archive: !unarchive });
  }

  async listMetrics(limit = 100, offset = 0): Promise<Metric[]> {
    const response = await this.client.get('/metrics', {
      params: { limit, offset },
    });
    return this.validateListResponse<Metric>(response, 'metrics', 'listMetrics');
  }

  async getMetric(id: MetricId): Promise<Metric> {
    const response = await this.client.get(`/metrics/${id}`);
    return response.data.metric;
  }

  async createMetric(data: Partial<Metric>): Promise<Metric> {
    const response = await this.client.post('/metrics', data);
    return response.data.metric;
  }

  async updateMetric(id: MetricId, data: Partial<Metric>): Promise<Metric> {
    const response = await this.client.put(`/metrics/${id}`, { data });
    return response.data.metric;
  }

  async archiveMetric(id: MetricId, unarchive = false): Promise<void> {
    await this.client.put(`/metrics/${id}/archive`, { archive: !unarchive });
  }

  async listApplications(): Promise<Application[]> {
    const response = await this.client.get('/applications');
    return this.validateListResponse<Application>(response, 'applications', 'listApplications');
  }

  async getApplication(id: ApplicationId): Promise<Application> {
    const response = await this.client.get(`/applications/${id}`);
    return response.data.application;
  }

  async listEnvironments(): Promise<Environment[]> {
    const response = await this.client.get('/environments');
    return this.validateListResponse<Environment>(response, 'environments', 'listEnvironments');
  }

  async getEnvironment(id: EnvironmentId): Promise<Environment> {
    const response = await this.client.get(`/environments/${id}`);
    return response.data.environment;
  }

  async listUnitTypes(): Promise<UnitType[]> {
    const response = await this.client.get('/unit_types');
    return this.validateListResponse<UnitType>(response, 'unit_types', 'listUnitTypes');
  }

  async getUnitType(id: UnitTypeId): Promise<UnitType> {
    const response = await this.client.get(`/unit_types/${id}`);
    return response.data.unit_type;
  }

  async listExperimentTags(limit = 100, offset = 0): Promise<ExperimentTag[]> {
    const response = await this.client.get('/experiment_tags', {
      params: { limit, offset },
    });
    return this.validateListResponse<ExperimentTag>(response, 'experiment_tags', 'listExperimentTags');
  }

  async getExperimentTag(id: TagId): Promise<ExperimentTag> {
    const response = await this.client.get<{ experiment_tag: ExperimentTag }>(
      `/experiment_tags/${id}`
    );
    return response.data.experiment_tag;
  }

  async createExperimentTag(data: { tag: string }): Promise<ExperimentTag> {
    const response = await this.client.post<{ experiment_tag: ExperimentTag }>(
      '/experiment_tags',
      data
    );
    return response.data.experiment_tag;
  }

  async updateExperimentTag(id: TagId, data: { tag: string }): Promise<ExperimentTag> {
    const response = await this.client.put<{ experiment_tag: ExperimentTag }>(
      `/experiment_tags/${id}`,
      { data }
    );
    return response.data.experiment_tag;
  }

  async deleteExperimentTag(id: TagId): Promise<void> {
    await this.client.delete(`/experiment_tags/${id}`);
  }

  async listGoalTags(limit = 100, offset = 0): Promise<GoalTag[]> {
    const response = await this.client.get('/goal_tags', {
      params: { limit, offset },
    });
    return this.validateListResponse<GoalTag>(response, 'goal_tags', 'listGoalTags');
  }

  async getGoalTag(id: TagId): Promise<GoalTag> {
    const response = await this.client.get<{ goal_tag: GoalTag }>(`/goal_tags/${id}`);
    return response.data.goal_tag;
  }

  async createGoalTag(data: { tag: string }): Promise<GoalTag> {
    const response = await this.client.post<{ goal_tag: GoalTag }>('/goal_tags', data);
    return response.data.goal_tag;
  }

  async updateGoalTag(id: TagId, data: { tag: string }): Promise<GoalTag> {
    const response = await this.client.put<{ goal_tag: GoalTag }>(`/goal_tags/${id}`, { data });
    return response.data.goal_tag;
  }

  async deleteGoalTag(id: TagId): Promise<void> {
    await this.client.delete(`/goal_tags/${id}`);
  }

  async listMetricTags(limit = 100, offset = 0): Promise<MetricTag[]> {
    const response = await this.client.get('/metric_tags', {
      params: { limit, offset },
    });
    return this.validateListResponse<MetricTag>(response, 'metric_tags', 'listMetricTags');
  }

  async getMetricTag(id: TagId): Promise<MetricTag> {
    const response = await this.client.get<{ metric_tag: MetricTag }>(`/metric_tags/${id}`);
    return response.data.metric_tag;
  }

  async createMetricTag(data: { tag: string }): Promise<MetricTag> {
    const response = await this.client.post<{ metric_tag: MetricTag }>('/metric_tags', data);
    return response.data.metric_tag;
  }

  async updateMetricTag(id: TagId, data: { tag: string }): Promise<MetricTag> {
    const response = await this.client.put<{ metric_tag: MetricTag }>(`/metric_tags/${id}`, { data });
    return response.data.metric_tag;
  }

  async deleteMetricTag(id: TagId): Promise<void> {
    await this.client.delete(`/metric_tags/${id}`);
  }

  async listMetricCategories(limit = 100, offset = 0): Promise<MetricCategory[]> {
    const response = await this.client.get('/metric_categories', {
      params: { limit, offset },
    });
    return this.validateListResponse<MetricCategory>(response, 'metric_categories', 'listMetricCategories');
  }

  async getMetricCategory(id: TagId): Promise<MetricCategory> {
    const response = await this.client.get<{ metric_category: MetricCategory }>(
      `/metric_categories/${id}`
    );
    return response.data.metric_category;
  }

  async createMetricCategory(data: {
    name: string;
    description?: string;
    color: string;
  }): Promise<MetricCategory> {
    const response = await this.client.post<{ metric_category: MetricCategory }>(
      '/metric_categories',
      data
    );
    return response.data.metric_category;
  }

  async updateMetricCategory(
    id: TagId,
    data: { name?: string; description?: string; color?: string }
  ): Promise<MetricCategory> {
    const response = await this.client.put<{ metric_category: MetricCategory }>(
      `/metric_categories/${id}`,
      { data }
    );
    return response.data.metric_category;
  }

  async archiveMetricCategory(id: TagId, archive = true): Promise<void> {
    await this.client.put(`/metric_categories/${id}/archive`, { archive });
  }

  async listRoles(limit = 20, offset = 0): Promise<Role[]> {
    const response = await this.client.get('/roles', {
      params: { limit, offset },
    });
    return this.validateListResponse<Role>(response, 'roles', 'listRoles');
  }

  async getRole(id: RoleId): Promise<Role> {
    const response = await this.client.get(`/roles/${id}`);
    return response.data.role;
  }

  async createRole(data: Partial<Role>): Promise<Role> {
    const response = await this.client.post('/roles', data);
    return response.data.role;
  }

  async updateRole(id: RoleId, data: Partial<Role>): Promise<Role> {
    const response = await this.client.put(`/roles/${id}`, { data });
    return response.data.role;
  }

  async deleteRole(id: RoleId): Promise<void> {
    await this.client.delete(`/roles/${id}`);
  }

  async listPermissions(): Promise<Permission[]> {
    const response = await this.client.get('/permissions');
    return this.validateListResponse<Permission>(response, 'permissions', 'listPermissions');
  }

  async listPermissionCategories(): Promise<PermissionCategory[]> {
    const response = await this.client.get('/permission_categories');
    return this.validateListResponse<PermissionCategory>(response, 'permission_categories', 'listPermissionCategories');
  }

  async listApiKeys(limit = 20, offset = 0): Promise<ApiKey[]> {
    const response = await this.client.get('/api_keys', {
      params: { limit, offset },
    });
    return this.validateListResponse<ApiKey>(response, 'api_keys', 'listApiKeys');
  }

  async getApiKey(id: ApiKeyId): Promise<ApiKey> {
    const response = await this.client.get(`/api_keys/${id}`);
    return response.data.api_key;
  }

  async createApiKey(data: Partial<ApiKey>): Promise<ApiKey> {
    const response = await this.client.post('/api_keys', data);
    return response.data.api_key;
  }

  async updateApiKey(id: ApiKeyId, data: Partial<ApiKey>): Promise<ApiKey> {
    const response = await this.client.put(`/api_keys/${id}`, { data });
    return response.data.api_key;
  }

  async deleteApiKey(id: ApiKeyId): Promise<void> {
    await this.client.delete(`/api_keys/${id}`);
  }

  async listWebhooks(limit = 20, offset = 0): Promise<Webhook[]> {
    const response = await this.client.get('/webhooks', {
      params: { limit, offset },
    });
    return this.validateListResponse<Webhook>(response, 'webhooks', 'listWebhooks');
  }

  async getWebhook(id: WebhookId): Promise<Webhook> {
    const response = await this.client.get(`/webhooks/${id}`);
    return response.data.webhook;
  }

  async createWebhook(data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.client.post('/webhooks', data);
    return response.data.webhook;
  }

  async updateWebhook(id: WebhookId, data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.client.put(`/webhooks/${id}`, { data });
    return response.data.webhook;
  }

  async deleteWebhook(id: WebhookId): Promise<void> {
    await this.client.delete(`/webhooks/${id}`);
  }

  async rawRequest(
    path: string,
    method = 'GET',
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<unknown> {
    const decodedPath = decodeURIComponent(path);

    if (decodedPath.includes('://') || decodedPath.startsWith('//')) {
      throw new Error(
        'Invalid API path: Absolute or protocol-relative URLs are not allowed.\n' +
        'Paths must be relative to the API endpoint (e.g., /experiments, /goals).'
      );
    }

    if (!decodedPath.startsWith('/')) {
      throw new Error(
        'Invalid API path: Must start with "/" (e.g., /experiments, not experiments).'
      );
    }

    if (decodedPath.includes('/../') || decodedPath.endsWith('/..') || decodedPath.includes('/./') || decodedPath === '/..') {
      throw new Error(
        'Invalid API path: Path traversal sequences (../, ./) are not allowed.\n' +
        'Use absolute paths from API root (e.g., /experiments, /goals).'
      );
    }

    const response = await this.client.request({
      url: path,
      method,
      ...(data !== undefined && { data }),
      ...(headers && { headers }),
    });
    return response.data;
  }
}

export function createAPIClient(
  endpoint: string,
  apiKey: string,
  options?: ClientOptions
): APIClient {
  return new APIClient(endpoint, apiKey, options);
}
