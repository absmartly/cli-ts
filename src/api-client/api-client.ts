import type { HttpClient, HttpRequestConfig, HttpResponse, APIError } from './http-client.js';
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
  ScheduledAction,
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
  CustomSectionField,
} from './types.js';

function createAPIError(message: string, response?: HttpResponse): APIError {
  const error = new Error(message) as APIError;
  if (response) {
    error.statusCode = response.status;
    error.response = response.data;
  }
  return error;
}

function buildErrorMessage(method: string, url: string, status: number, response?: HttpResponse): string {
  switch (status) {
    case 401:
      return (
        `Unauthorized: Invalid or expired API key.\n` +
        `Endpoint: ${method} ${url}`
      );
    case 403:
      return (
        `Forbidden: Insufficient permissions for this operation.\n` +
        `Endpoint: ${method} ${url}\n` +
        `Please check your API key has the required permissions.`
      );
    case 404:
      return (
        `Not found: Resource does not exist.\n` +
        `Endpoint: ${method} ${url}`
      );
    case 429: {
      const retryAfter = response?.headers['retry-after'];
      return (
        `Rate limit exceeded.\n` +
        `Endpoint: ${method} ${url}\n` +
        (retryAfter ? `Retry after: ${retryAfter} seconds` : 'Please try again later.')
      );
    }
    default:
      return (
        `API error (${status})\n` +
        `Endpoint: ${method} ${url}`
      );
  }
}

export class APIClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options?: {
      params?: Record<string, string | number | boolean | undefined>;
      data?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<HttpResponse<T>> {
    const config: HttpRequestConfig = { method, url };
    if (options?.params) config.params = options.params;
    if (options?.data !== undefined) config.data = options.data;
    if (options?.headers) config.headers = options.headers;
    const response = await this.httpClient.request<T>(config);

    if (response.status >= 400) {
      throw createAPIError(
        buildErrorMessage(method, url, response.status, response),
        response
      );
    }

    return response;
  }

  private validateListResponse<T>(
    response: HttpResponse,
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

  private validateOkResponse(response: HttpResponse, operation: string): void {
    const data = response.data as Record<string, unknown> | null;
    if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
      const errors: string[] = Array.isArray(data.errors) ? data.errors as string[] : [];
      throw createAPIError(
        `${operation} failed: ${errors.join(', ') || 'unknown error'}`,
        response
      );
    }
  }

  private validateEntityResponse<T>(
    response: HttpResponse,
    expectedKey: string,
    operation: string
  ): T {
    const data = response.data;

    if (!data || typeof data !== 'object') {
      throw new Error(
        `Invalid API response for ${operation}: Expected object, got ${typeof data}`
      );
    }

    const entity = (data as Record<string, unknown>)[expectedKey];

    if (entity === undefined) {
      throw new Error(
        `Invalid API response for ${operation}: Missing "${expectedKey}" field\n` +
        `Response keys: ${Object.keys(data).join(', ')}`
      );
    }

    return entity as T;
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

    const response = await this.request('GET', '/experiments', { params });
    return this.validateListResponse<Experiment>(response, 'experiments', 'listExperiments');
  }

  async getExperiment(id: ExperimentId): Promise<Experiment> {
    const response = await this.request('GET', `/experiments/${id}`);
    return this.validateEntityResponse<Experiment>(response, 'experiment', 'getExperiment');
  }

  async createExperiment(data: Partial<Experiment>): Promise<Experiment> {
    const response = await this.request('POST', '/experiments', { data });
    this.validateOkResponse(response, 'createExperiment');
    return this.validateEntityResponse<Experiment>(response, 'experiment', 'createExperiment');
  }

  async updateExperiment(id: ExperimentId, data: Partial<Experiment>): Promise<Experiment> {
    const response = await this.request('PUT', `/experiments/${id}`, { data: { data } });
    return this.validateEntityResponse<Experiment>(response, 'experiment', 'updateExperiment');
  }

  async startExperiment(id: ExperimentId): Promise<Experiment> {
    const response = await this.request('PUT', `/experiments/${id}/start`);
    return this.validateEntityResponse<Experiment>(response, 'experiment', 'startExperiment');
  }

  async stopExperiment(id: ExperimentId, reason?: string): Promise<Experiment> {
    const response = await this.request('PUT', `/experiments/${id}/stop`, {
      data: { ...(reason !== undefined && { reason }) },
    });
    return this.validateEntityResponse<Experiment>(response, 'experiment', 'stopExperiment');
  }

  async archiveExperiment(id: ExperimentId, unarchive = false): Promise<void> {
    await this.request('PUT', `/experiments/${id}/archive`, { data: { archive: !unarchive } });
  }

  async developmentExperiment(id: ExperimentId, note: string): Promise<Experiment> {
    const response = await this.request('PUT', `/experiments/${id}/development`, { data: { note } });
    return this.validateEntityResponse<Experiment>(response, 'experiment', 'developmentExperiment');
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
    const response = await this.request<Record<string, unknown>>('PUT', `/experiments/${id}/restart`, { data: options });
    const responseData = response.data;
    const experiment = responseData.new_experiment ?? responseData.experiment;
    if (!experiment) {
      throw new Error(
        `Invalid API response for restartExperiment: Missing "new_experiment" or "experiment" field\n` +
        `Response keys: ${Object.keys(responseData).join(', ')}`
      );
    }
    return experiment as Experiment;
  }

  async fullOnExperiment(id: ExperimentId, fullOnVariant: number, note: string): Promise<Experiment> {
    const response = await this.request('PUT', `/experiments/${id}/full_on`, {
      data: { full_on_variant: fullOnVariant, note },
    });
    return this.validateEntityResponse<Experiment>(response, 'experiment', 'fullOnExperiment');
  }

  async createScheduledAction(
    id: ExperimentId,
    action: string,
    scheduledAt: string,
    note: string,
    reason?: string
  ): Promise<ScheduledAction> {
    const body: Record<string, unknown> = { action, scheduled_at: scheduledAt, note };
    if (reason) body.reason = reason;
    const response = await this.request('POST', `/experiments/${id}/scheduled_action`, { data: body });
    return this.validateEntityResponse<ScheduledAction>(response, 'scheduled_action', 'createScheduledAction');
  }

  async deleteScheduledAction(id: ExperimentId, actionId: ScheduledActionId): Promise<void> {
    await this.request('DELETE', `/experiments/${id}/scheduled_action/${actionId}`);
  }

  async listExperimentActivity(id: ExperimentId): Promise<Note[]> {
    const response = await this.request('GET', `/experiments/${id}/activity`);
    return this.validateListResponse<Note>(response, 'experiment_notes', 'listExperimentActivity');
  }

  async createExperimentNote(id: ExperimentId, note: string): Promise<Note> {
    const response = await this.request('POST', `/experiments/${id}/activity`, { data: { note } });
    return this.validateEntityResponse<Note>(response, 'experiment_note', 'createExperimentNote');
  }

  async searchExperiments(query: string, limit = 50): Promise<Experiment[]> {
    return this.listExperiments({ search: query, limit });
  }

  async listGoals(limit = 100, offset = 0): Promise<Goal[]> {
    const response = await this.request('GET', '/goals', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<Goal>(response, 'goals', 'listGoals');
  }

  async getGoal(id: GoalId): Promise<Goal> {
    const response = await this.request('GET', `/goals/${id}`);
    return this.validateEntityResponse<Goal>(response, 'goal', 'getGoal');
  }

  async createGoal(data: Partial<Goal>): Promise<Goal> {
    const response = await this.request('POST', '/goals', { data });
    return this.validateEntityResponse<Goal>(response, 'goal', 'createGoal');
  }

  async updateGoal(id: GoalId, data: Partial<Goal>): Promise<Goal> {
    const response = await this.request('PUT', `/goals/${id}`, { data: { data } });
    return this.validateEntityResponse<Goal>(response, 'goal', 'updateGoal');
  }

  async listSegments(limit = 100, offset = 0): Promise<Segment[]> {
    const response = await this.request('GET', '/segments', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<Segment>(response, 'segments', 'listSegments');
  }

  async getSegment(id: SegmentId): Promise<Segment> {
    const response = await this.request('GET', `/segments/${id}`);
    return this.validateEntityResponse<Segment>(response, 'segment', 'getSegment');
  }

  async createSegment(data: Partial<Segment>): Promise<Segment> {
    const response = await this.request('POST', '/segments', { data });
    return this.validateEntityResponse<Segment>(response, 'segment', 'createSegment');
  }

  async updateSegment(id: SegmentId, data: Partial<Segment>): Promise<Segment> {
    const response = await this.request('PUT', `/segments/${id}`, { data: { data } });
    return this.validateEntityResponse<Segment>(response, 'segment', 'updateSegment');
  }

  async deleteSegment(id: SegmentId): Promise<void> {
    await this.request('DELETE', `/segments/${id}`);
  }

  async listTeams(includeArchived = false): Promise<Team[]> {
    const response = await this.request('GET', '/teams', {
      params: { include_archived: includeArchived ? '1' : '0' },
    });
    return this.validateListResponse<Team>(response, 'teams', 'listTeams');
  }

  async getTeam(id: TeamId): Promise<Team> {
    const response = await this.request('GET', `/teams/${id}`);
    return this.validateEntityResponse<Team>(response, 'team', 'getTeam');
  }

  async createTeam(data: Partial<Team>): Promise<Team> {
    const response = await this.request('POST', '/teams', { data });
    return this.validateEntityResponse<Team>(response, 'team', 'createTeam');
  }

  async updateTeam(id: TeamId, data: Partial<Team>): Promise<Team> {
    const response = await this.request('PUT', `/teams/${id}`, { data: { data } });
    return this.validateEntityResponse<Team>(response, 'team', 'updateTeam');
  }

  async archiveTeam(id: TeamId, unarchive = false): Promise<void> {
    await this.request('PUT', `/teams/${id}/archive`, { data: { archive: !unarchive } });
  }

  async listUsers(includeArchived = false): Promise<User[]> {
    const response = await this.request('GET', '/users', {
      params: { include_archived: includeArchived ? '1' : '0' },
    });
    return this.validateListResponse<User>(response, 'users', 'listUsers');
  }

  async getUser(id: UserId): Promise<User> {
    const response = await this.request('GET', `/users/${id}`);
    return this.validateEntityResponse<User>(response, 'user', 'getUser');
  }

  async createUser(data: Partial<User>): Promise<User> {
    const response = await this.request('POST', '/users', { data });
    return this.validateEntityResponse<User>(response, 'user', 'createUser');
  }

  async updateUser(id: UserId, data: Partial<User>): Promise<User> {
    const response = await this.request('PUT', `/users/${id}`, { data: { data } });
    return this.validateEntityResponse<User>(response, 'user', 'updateUser');
  }

  async archiveUser(id: UserId, unarchive = false): Promise<void> {
    await this.request('PUT', `/users/${id}/archive`, { data: { archive: !unarchive } });
  }

  async listMetrics(limit = 100, offset = 0): Promise<Metric[]> {
    const response = await this.request('GET', '/metrics', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<Metric>(response, 'metrics', 'listMetrics');
  }

  async getMetric(id: MetricId): Promise<Metric> {
    const response = await this.request('GET', `/metrics/${id}`);
    return this.validateEntityResponse<Metric>(response, 'metric', 'getMetric');
  }

  async createMetric(data: Partial<Metric>): Promise<Metric> {
    const response = await this.request('POST', '/metrics', { data });
    return this.validateEntityResponse<Metric>(response, 'metric', 'createMetric');
  }

  async updateMetric(id: MetricId, data: Partial<Metric>): Promise<Metric> {
    const response = await this.request('PUT', `/metrics/${id}`, { data: { data } });
    return this.validateEntityResponse<Metric>(response, 'metric', 'updateMetric');
  }

  async createUserApiKey(name: string, description?: string): Promise<{ id: number; name: string; key: string }> {
    const response = await this.request<Record<string, unknown>>('POST', '/auth/current-user/api_keys', {
      data: { name, description: description || '' },
    });
    return this.validateEntityResponse<{ id: number; name: string; key: string }>(response, 'user_api_key', 'createUserApiKey');
  }

  async activateMetric(id: MetricId, reason: string): Promise<Metric> {
    const response = await this.request('PUT', `/metrics/${id}/activate`, { data: { reason } });
    return this.validateEntityResponse<Metric>(response, 'metric', 'activateMetric');
  }

  async archiveMetric(id: MetricId, unarchive = false): Promise<void> {
    await this.request('PUT', `/metrics/${id}/archive`, { data: { archive: !unarchive } });
  }

  async listCustomSectionFields(): Promise<CustomSectionField[]> {
    const response = await this.request<Record<string, unknown>>('GET', '/experiment_custom_section_fields');
    const data = response.data;
    return (data.experiment_custom_section_fields ?? data.items ?? data) as CustomSectionField[];
  }

  async listApplications(): Promise<Application[]> {
    const response = await this.request('GET', '/applications');
    return this.validateListResponse<Application>(response, 'applications', 'listApplications');
  }

  async getApplication(id: ApplicationId): Promise<Application> {
    const response = await this.request('GET', `/applications/${id}`);
    return this.validateEntityResponse<Application>(response, 'application', 'getApplication');
  }

  async listEnvironments(): Promise<Environment[]> {
    const response = await this.request('GET', '/environments');
    return this.validateListResponse<Environment>(response, 'environments', 'listEnvironments');
  }

  async getEnvironment(id: EnvironmentId): Promise<Environment> {
    const response = await this.request('GET', `/environments/${id}`);
    return this.validateEntityResponse<Environment>(response, 'environment', 'getEnvironment');
  }

  async listUnitTypes(): Promise<UnitType[]> {
    const response = await this.request('GET', '/unit_types');
    return this.validateListResponse<UnitType>(response, 'unit_types', 'listUnitTypes');
  }

  async getUnitType(id: UnitTypeId): Promise<UnitType> {
    const response = await this.request('GET', `/unit_types/${id}`);
    return this.validateEntityResponse<UnitType>(response, 'unit_type', 'getUnitType');
  }

  async listExperimentTags(limit = 100, offset = 0): Promise<ExperimentTag[]> {
    const response = await this.request('GET', '/experiment_tags', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<ExperimentTag>(response, 'experiment_tags', 'listExperimentTags');
  }

  async getExperimentTag(id: TagId): Promise<ExperimentTag> {
    const response = await this.request('GET', `/experiment_tags/${id}`);
    return this.validateEntityResponse<ExperimentTag>(response, 'experiment_tag', 'getExperimentTag');
  }

  async createExperimentTag(data: { tag: string }): Promise<ExperimentTag> {
    const response = await this.request('POST', '/experiment_tags', { data });
    return this.validateEntityResponse<ExperimentTag>(response, 'experiment_tag', 'createExperimentTag');
  }

  async updateExperimentTag(id: TagId, data: { tag: string }): Promise<ExperimentTag> {
    const response = await this.request('PUT', `/experiment_tags/${id}`, { data: { data } });
    return this.validateEntityResponse<ExperimentTag>(response, 'experiment_tag', 'updateExperimentTag');
  }

  async deleteExperimentTag(id: TagId): Promise<void> {
    await this.request('DELETE', `/experiment_tags/${id}`);
  }

  async listGoalTags(limit = 100, offset = 0): Promise<GoalTag[]> {
    const response = await this.request('GET', '/goal_tags', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<GoalTag>(response, 'goal_tags', 'listGoalTags');
  }

  async getGoalTag(id: TagId): Promise<GoalTag> {
    const response = await this.request('GET', `/goal_tags/${id}`);
    return this.validateEntityResponse<GoalTag>(response, 'goal_tag', 'getGoalTag');
  }

  async createGoalTag(data: { tag: string }): Promise<GoalTag> {
    const response = await this.request('POST', '/goal_tags', { data });
    return this.validateEntityResponse<GoalTag>(response, 'goal_tag', 'createGoalTag');
  }

  async updateGoalTag(id: TagId, data: { tag: string }): Promise<GoalTag> {
    const response = await this.request('PUT', `/goal_tags/${id}`, { data: { data } });
    return this.validateEntityResponse<GoalTag>(response, 'goal_tag', 'updateGoalTag');
  }

  async deleteGoalTag(id: TagId): Promise<void> {
    await this.request('DELETE', `/goal_tags/${id}`);
  }

  async listMetricTags(limit = 100, offset = 0): Promise<MetricTag[]> {
    const response = await this.request('GET', '/metric_tags', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<MetricTag>(response, 'metric_tags', 'listMetricTags');
  }

  async getMetricTag(id: TagId): Promise<MetricTag> {
    const response = await this.request('GET', `/metric_tags/${id}`);
    return this.validateEntityResponse<MetricTag>(response, 'metric_tag', 'getMetricTag');
  }

  async createMetricTag(data: { tag: string }): Promise<MetricTag> {
    const response = await this.request('POST', '/metric_tags', { data });
    return this.validateEntityResponse<MetricTag>(response, 'metric_tag', 'createMetricTag');
  }

  async updateMetricTag(id: TagId, data: { tag: string }): Promise<MetricTag> {
    const response = await this.request('PUT', `/metric_tags/${id}`, { data: { data } });
    return this.validateEntityResponse<MetricTag>(response, 'metric_tag', 'updateMetricTag');
  }

  async deleteMetricTag(id: TagId): Promise<void> {
    await this.request('DELETE', `/metric_tags/${id}`);
  }

  async listMetricCategories(limit = 100, offset = 0): Promise<MetricCategory[]> {
    const response = await this.request('GET', '/metric_categories', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<MetricCategory>(response, 'metric_categories', 'listMetricCategories');
  }

  async getMetricCategory(id: TagId): Promise<MetricCategory> {
    const response = await this.request('GET', `/metric_categories/${id}`);
    return this.validateEntityResponse<MetricCategory>(response, 'metric_category', 'getMetricCategory');
  }

  async createMetricCategory(data: {
    name: string;
    description?: string;
    color: string;
  }): Promise<MetricCategory> {
    const response = await this.request('POST', '/metric_categories', { data });
    return this.validateEntityResponse<MetricCategory>(response, 'metric_category', 'createMetricCategory');
  }

  async updateMetricCategory(
    id: TagId,
    data: { name?: string; description?: string; color?: string }
  ): Promise<MetricCategory> {
    const response = await this.request('PUT', `/metric_categories/${id}`, { data: { data } });
    return this.validateEntityResponse<MetricCategory>(response, 'metric_category', 'updateMetricCategory');
  }

  async archiveMetricCategory(id: TagId, archive = true): Promise<void> {
    await this.request('PUT', `/metric_categories/${id}/archive`, { data: { archive } });
  }

  async listRoles(limit = 20, offset = 0): Promise<Role[]> {
    const response = await this.request('GET', '/roles', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<Role>(response, 'roles', 'listRoles');
  }

  async getRole(id: RoleId): Promise<Role> {
    const response = await this.request('GET', `/roles/${id}`);
    return this.validateEntityResponse<Role>(response, 'role', 'getRole');
  }

  async createRole(data: Partial<Role>): Promise<Role> {
    const response = await this.request('POST', '/roles', { data });
    return this.validateEntityResponse<Role>(response, 'role', 'createRole');
  }

  async updateRole(id: RoleId, data: Partial<Role>): Promise<Role> {
    const response = await this.request('PUT', `/roles/${id}`, { data: { data } });
    return this.validateEntityResponse<Role>(response, 'role', 'updateRole');
  }

  async deleteRole(id: RoleId): Promise<void> {
    await this.request('DELETE', `/roles/${id}`);
  }

  async listPermissions(): Promise<Permission[]> {
    const response = await this.request('GET', '/permissions');
    return this.validateListResponse<Permission>(response, 'permissions', 'listPermissions');
  }

  async listPermissionCategories(): Promise<PermissionCategory[]> {
    const response = await this.request('GET', '/permission_categories');
    return this.validateListResponse<PermissionCategory>(response, 'permission_categories', 'listPermissionCategories');
  }

  async listApiKeys(limit = 20, offset = 0): Promise<ApiKey[]> {
    const response = await this.request('GET', '/api_keys', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<ApiKey>(response, 'api_keys', 'listApiKeys');
  }

  async getApiKey(id: ApiKeyId): Promise<ApiKey> {
    const response = await this.request('GET', `/api_keys/${id}`);
    return this.validateEntityResponse<ApiKey>(response, 'api_key', 'getApiKey');
  }

  async createApiKey(data: Partial<ApiKey>): Promise<ApiKey> {
    const response = await this.request('POST', '/api_keys', { data });
    return this.validateEntityResponse<ApiKey>(response, 'api_key', 'createApiKey');
  }

  async updateApiKey(id: ApiKeyId, data: Partial<ApiKey>): Promise<ApiKey> {
    const response = await this.request('PUT', `/api_keys/${id}`, { data: { data } });
    return this.validateEntityResponse<ApiKey>(response, 'api_key', 'updateApiKey');
  }

  async deleteApiKey(id: ApiKeyId): Promise<void> {
    await this.request('DELETE', `/api_keys/${id}`);
  }

  async listWebhooks(limit = 20, offset = 0): Promise<Webhook[]> {
    const response = await this.request('GET', '/webhooks', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return this.validateListResponse<Webhook>(response, 'webhooks', 'listWebhooks');
  }

  async getWebhook(id: WebhookId): Promise<Webhook> {
    const response = await this.request('GET', `/webhooks/${id}`);
    return this.validateEntityResponse<Webhook>(response, 'webhook', 'getWebhook');
  }

  async createWebhook(data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.request('POST', '/webhooks', { data });
    return this.validateEntityResponse<Webhook>(response, 'webhook', 'createWebhook');
  }

  async updateWebhook(id: WebhookId, data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.request('PUT', `/webhooks/${id}`, { data: { data } });
    return this.validateEntityResponse<Webhook>(response, 'webhook', 'updateWebhook');
  }

  async deleteWebhook(id: WebhookId): Promise<void> {
    await this.request('DELETE', `/webhooks/${id}`);
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

    const normalizedMethod = method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE';
    const response = await this.request(normalizedMethod, path, {
      ...(data !== undefined && { data }),
      ...(headers && { headers }),
    });
    return response.data;
  }
}

export function createAPIClient(httpClient: HttpClient): APIClient {
  return new APIClient(httpClient);
}
