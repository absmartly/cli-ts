import type { HttpClient, HttpRequestConfig, HttpResponse, APIError } from './http-client.js';
import { experimentToInput } from './experiment-transform.js';
import type { ExperimentInput } from './experiment-transform.js';
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
  NoteId,
  AlertId,
  TagId,
  RoleId,
  ApiKeyId,
  WebhookId,
  ScheduledActionId,
  CustomSectionField,
  CustomSectionFieldId,
  AssetRole,
  AssetRoleId,
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

  async updateExperiment(
    id: ExperimentId,
    changes: Partial<ExperimentInput>,
    options?: { note?: string; update_metric_versions?: boolean }
  ): Promise<Experiment> {
    const experiment = await this.getExperiment(id);
    const input = experimentToInput(experiment);
    const merged = { ...input, ...changes };
    const payload: Record<string, unknown> = {
      id: experiment.id,
      data: merged,
    };
    if (options?.note !== undefined) payload.note = options.note;
    if (options?.update_metric_versions !== undefined) payload.update_metric_versions = options.update_metric_versions;
    const response = await this.request('PUT', `/experiments/${id}`, { data: payload });
    this.validateOkResponse(response, 'updateExperiment');
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

  async deleteExperiment(id: ExperimentId): Promise<void> {
    const response = await this.request('DELETE', `/experiments/${id}`);
    this.validateOkResponse(response, 'deleteExperiment');
  }

  async getParentExperiment(id: ExperimentId): Promise<Experiment> {
    const response = await this.request('GET', `/experiments/${id}/parent`);
    return this.validateEntityResponse<Experiment>(response, 'parent_experiment', 'getParentExperiment');
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
      restart_as_type?: 'feature' | 'experiment';
      changes?: Partial<ExperimentInput>;
    } = {}
  ): Promise<Experiment> {
    const current = await this.getExperiment(id);
    const input = experimentToInput(current);
    const data: Record<string, unknown> = options.changes ? { ...input, ...options.changes } : { ...input };

    if (options.restart_as_type) {
      const dbType = options.restart_as_type === 'experiment' ? 'test' : options.restart_as_type;
      data.type = dbType;
      if (dbType === 'feature') {
        data.analysis_type = null;
        data.required_alpha = null;
        data.required_power = null;
        data.group_sequential_futility_type = null;
        data.group_sequential_analysis_count = null;
        data.group_sequential_min_analysis_interval = null;
        data.group_sequential_first_analysis_interval = null;
        data.group_sequential_max_duration_interval = null;
        data.minimum_detectable_effect = null;
        data.baseline_primary_metric_mean = null;
        data.baseline_primary_metric_stdev = null;
        data.baseline_participants_per_day = null;
      } else if (dbType === 'test' && !data.analysis_type) {
        data.analysis_type = 'group_sequential';
        data.required_alpha = '0.1';
        data.required_power = '0.8';
        data.group_sequential_futility_type = 'binding';
        data.group_sequential_min_analysis_interval = '1d';
        data.group_sequential_first_analysis_interval = '7d';
        data.group_sequential_max_duration_interval = '6w';
      }
    }

    const payload: Record<string, unknown> = {
      data,
      version: Date.now(),
      state: options.state ?? 'running',
      reshuffle: options.reshuffle ?? false,
    };
    if (options.note !== undefined) payload.note = options.note;
    if (options.reason !== undefined) payload.reason = options.reason;
    if (options.restart_as_type !== undefined) payload.restart_as_type = options.restart_as_type;

    const response = await this.request<Record<string, unknown>>('PUT', `/experiments/${id}/restart`, { data: payload });
    this.validateOkResponse(response, 'restartExperiment');
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

  async listExperimentMetrics(id: ExperimentId): Promise<unknown[]> {
    const response = await this.request('GET', `/experiments/${id}/metrics`);
    return this.validateListResponse<unknown>(response, 'experiment_metrics', 'listExperimentMetrics');
  }

  async addExperimentMetrics(id: ExperimentId, metricIds: MetricId[]): Promise<void> {
    const response = await this.request('POST', `/experiments/${id}/metrics`, { data: { metric_ids: metricIds } });
    this.validateOkResponse(response, 'addExperimentMetrics');
  }

  async confirmMetricImpact(experimentId: ExperimentId, metricId: MetricId): Promise<void> {
    const response = await this.request('POST', `/experiments/${experimentId}/metrics/${metricId}/confirm_impact`);
    this.validateOkResponse(response, 'confirmMetricImpact');
  }

  async excludeExperimentMetric(experimentId: ExperimentId, metricId: MetricId): Promise<void> {
    const response = await this.request('POST', `/experiments/${experimentId}/metrics/${metricId}/exclude`);
    this.validateOkResponse(response, 'excludeExperimentMetric');
  }

  async includeExperimentMetric(experimentId: ExperimentId, metricId: MetricId): Promise<void> {
    const response = await this.request('POST', `/experiments/${experimentId}/metrics/${metricId}/include`);
    this.validateOkResponse(response, 'includeExperimentMetric');
  }

  async removeMetricImpact(experimentId: ExperimentId, metricId: MetricId): Promise<void> {
    const response = await this.request('POST', `/experiments/${experimentId}/metrics/${metricId}/remove_impact`);
    this.validateOkResponse(response, 'removeMetricImpact');
  }

  async listExperimentActivity(id: ExperimentId): Promise<Note[]> {
    const response = await this.request('GET', `/experiments/${id}/activity`);
    return this.validateListResponse<Note>(response, 'experiment_notes', 'listExperimentActivity');
  }

  async createExperimentNote(id: ExperimentId, note: string): Promise<Note> {
    const response = await this.request('POST', `/experiments/${id}/activity`, { data: { note } });
    return this.validateEntityResponse<Note>(response, 'experiment_note', 'createExperimentNote');
  }

  async editExperimentNote(id: ExperimentId, noteId: NoteId, note: string): Promise<Note> {
    const response = await this.request('PUT', `/experiments/${id}/activity/${noteId}`, { data: { note } });
    this.validateOkResponse(response, 'editExperimentNote');
    return this.validateEntityResponse<Note>(response, 'experiment_note', 'editExperimentNote');
  }

  async replyToExperimentNote(id: ExperimentId, noteId: NoteId, note: string): Promise<Note> {
    const response = await this.request('POST', `/experiments/${id}/activity/${noteId}/reply`, { data: { note } });
    this.validateOkResponse(response, 'replyToExperimentNote');
    return this.validateEntityResponse<Note>(response, 'experiment_note', 'replyToExperimentNote');
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

  async listCustomSectionFields(limit = 100, offset = 0): Promise<CustomSectionField[]> {
    const response = await this.request<Record<string, unknown>>('GET', '/experiment_custom_section_fields', {
      params: { limit: String(limit), offset: String(offset) },
    });
    const data = response.data;
    return (data.experiment_custom_section_fields ?? data.items ?? data) as CustomSectionField[];
  }

  async getCustomSectionField(id: CustomSectionFieldId): Promise<CustomSectionField> {
    const response = await this.request('GET', `/experiment_custom_section_fields/${id}`);
    return this.validateEntityResponse<CustomSectionField>(response, 'experiment_custom_section_field', 'getCustomSectionField');
  }

  async createCustomSectionField(data: Partial<CustomSectionField>): Promise<CustomSectionField> {
    const response = await this.request('POST', '/experiment_custom_section_fields', { data });
    return this.validateEntityResponse<CustomSectionField>(response, 'experiment_custom_section_field', 'createCustomSectionField');
  }

  async updateCustomSectionField(id: CustomSectionFieldId, data: Partial<CustomSectionField>): Promise<CustomSectionField> {
    const response = await this.request('PUT', `/experiment_custom_section_fields/${id}`, { data });
    return this.validateEntityResponse<CustomSectionField>(response, 'experiment_custom_section_field', 'updateCustomSectionField');
  }

  async archiveCustomSectionField(id: CustomSectionFieldId, unarchive = false): Promise<void> {
    await this.request('PUT', `/experiment_custom_section_fields/${id}/archive`, { data: { archive: !unarchive } });
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

  async listTeamMembers(id: TeamId): Promise<User[]> {
    const response = await this.request('GET', `/teams/${id}/members`);
    return this.validateListResponse<User>(response, 'team_members', 'listTeamMembers');
  }

  async addTeamMembers(id: TeamId, userIds: UserId[], roleIds?: RoleId[]): Promise<void> {
    const body: Record<string, unknown> = { user_ids: userIds };
    if (roleIds) body.role_ids = roleIds;
    const response = await this.request('PUT', `/teams/${id}/members/add`, { data: body });
    this.validateOkResponse(response, 'addTeamMembers');
  }

  async editTeamMemberRoles(id: TeamId, userIds: UserId[], roleIds: RoleId[]): Promise<void> {
    const response = await this.request('PUT', `/teams/${id}/members/edit_roles`, {
      data: { user_ids: userIds, role_ids: roleIds },
    });
    this.validateOkResponse(response, 'editTeamMemberRoles');
  }

  async removeTeamMembers(id: TeamId, userIds: UserId[]): Promise<void> {
    const response = await this.request('PUT', `/teams/${id}/members/remove`, {
      data: { user_ids: userIds },
    });
    this.validateOkResponse(response, 'removeTeamMembers');
  }

  async followExperiment(id: ExperimentId): Promise<void> {
    const response = await this.request('POST', `/experiments/${id}/follow`);
    this.validateOkResponse(response, 'followExperiment');
  }

  async unfollowExperiment(id: ExperimentId): Promise<void> {
    const response = await this.request('DELETE', `/experiments/${id}/follow`);
    this.validateOkResponse(response, 'unfollowExperiment');
  }

  async followMetric(id: MetricId): Promise<void> {
    const response = await this.request('POST', `/metrics/${id}/follow`);
    this.validateOkResponse(response, 'followMetric');
  }

  async unfollowMetric(id: MetricId): Promise<void> {
    const response = await this.request('DELETE', `/metrics/${id}/follow`);
    this.validateOkResponse(response, 'unfollowMetric');
  }

  async followGoal(id: GoalId): Promise<void> {
    const response = await this.request('POST', `/goals/${id}/follow`);
    this.validateOkResponse(response, 'followGoal');
  }

  async unfollowGoal(id: GoalId): Promise<void> {
    const response = await this.request('DELETE', `/goals/${id}/follow`);
    this.validateOkResponse(response, 'unfollowGoal');
  }

  async favoriteExperiment(id: ExperimentId, favorite: boolean): Promise<void> {
    await this.request('PUT', '/favorites/experiment', {
      params: { id: String(id), favorite: String(favorite) },
    });
  }

  async favoriteMetric(id: MetricId, favorite: boolean): Promise<void> {
    await this.request('PUT', '/favorites/metric', {
      params: { id: String(id), favorite: String(favorite) },
    });
  }

  async getNotifications(cursor?: number): Promise<unknown[]> {
    const params: Record<string, string | number> = {};
    if (cursor !== undefined) params.cursor = cursor;
    const response = await this.request<Record<string, unknown>>('GET', '/notifications/summary', { params });
    const data = response.data;
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response for getNotifications: Expected object');
    }
    const notifications = (data as Record<string, unknown>).notifications;
    if (!Array.isArray(notifications)) {
      throw new Error('Invalid API response for getNotifications: Missing "notifications" array');
    }
    return notifications;
  }

  async markNotificationsSeen(): Promise<void> {
    const response = await this.request('PUT', '/notifications/see');
    this.validateOkResponse(response, 'markNotificationsSeen');
  }

  async markNotificationsRead(ids?: number[]): Promise<void> {
    const body: Record<string, unknown> = {};
    if (ids) body.ids = ids;
    const response = await this.request('PUT', '/notifications/read', { data: body });
    this.validateOkResponse(response, 'markNotificationsRead');
  }

  async hasNewNotifications(lastNotificationId?: number): Promise<boolean> {
    const params: Record<string, string | number> = {};
    if (lastNotificationId !== undefined) params.last_notification_id = lastNotificationId;
    const response = await this.request<Record<string, unknown>>('GET', '/notifications/has-new', { params });
    const data = response.data;
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response for hasNewNotifications: Expected object');
    }
    return Boolean((data as Record<string, unknown>).has_new);
  }

  async listExperimentAccessUsers(id: ExperimentId): Promise<unknown[]> {
    const response = await this.request('GET', `/experiments/${id}/asset_role_users`);
    return this.validateListResponse<unknown>(response, 'asset_role_experiment_users', 'listExperimentAccessUsers');
  }

  async grantExperimentAccessUser(id: ExperimentId, userId: UserId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('POST', `/experiments/${id}/asset_role_users`, { data: { user_id: userId, asset_role_id: assetRoleId } });
  }

  async revokeExperimentAccessUser(id: ExperimentId, userId: UserId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('DELETE', `/experiments/${id}/asset_role_users/${userId}/${assetRoleId}`);
  }

  async listExperimentAccessTeams(id: ExperimentId): Promise<unknown[]> {
    const response = await this.request('GET', `/experiments/${id}/asset_role_teams`);
    return this.validateListResponse<unknown>(response, 'asset_role_experiment_teams', 'listExperimentAccessTeams');
  }

  async grantExperimentAccessTeam(id: ExperimentId, teamId: TeamId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('POST', `/experiments/${id}/asset_role_teams`, { data: { team_id: teamId, asset_role_id: assetRoleId } });
  }

  async revokeExperimentAccessTeam(id: ExperimentId, teamId: TeamId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('DELETE', `/experiments/${id}/asset_role_teams/${teamId}/${assetRoleId}`);
  }

  async listMetricAccessUsers(id: MetricId): Promise<unknown[]> {
    const response = await this.request('GET', `/metrics/${id}/asset_role_users`);
    return this.validateListResponse<unknown>(response, 'asset_role_metric_users', 'listMetricAccessUsers');
  }

  async grantMetricAccessUser(id: MetricId, userId: UserId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('POST', `/metrics/${id}/asset_role_users`, { data: { user_id: userId, asset_role_id: assetRoleId } });
  }

  async revokeMetricAccessUser(id: MetricId, userId: UserId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('DELETE', `/metrics/${id}/asset_role_users/${userId}/${assetRoleId}`);
  }

  async listMetricAccessTeams(id: MetricId): Promise<unknown[]> {
    const response = await this.request('GET', `/metrics/${id}/asset_role_teams`);
    return this.validateListResponse<unknown>(response, 'asset_role_metric_teams', 'listMetricAccessTeams');
  }

  async grantMetricAccessTeam(id: MetricId, teamId: TeamId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('POST', `/metrics/${id}/asset_role_teams`, { data: { team_id: teamId, asset_role_id: assetRoleId } });
  }

  async revokeMetricAccessTeam(id: MetricId, teamId: TeamId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('DELETE', `/metrics/${id}/asset_role_teams/${teamId}/${assetRoleId}`);
  }

  async listGoalAccessUsers(id: GoalId): Promise<unknown[]> {
    const response = await this.request('GET', `/goals/${id}/asset_role_users`);
    return this.validateListResponse<unknown>(response, 'asset_role_goal_users', 'listGoalAccessUsers');
  }

  async grantGoalAccessUser(id: GoalId, userId: UserId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('POST', `/goals/${id}/asset_role_users`, { data: { user_id: userId, asset_role_id: assetRoleId } });
  }

  async revokeGoalAccessUser(id: GoalId, userId: UserId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('DELETE', `/goals/${id}/asset_role_users/${userId}/${assetRoleId}`);
  }

  async listGoalAccessTeams(id: GoalId): Promise<unknown[]> {
    const response = await this.request('GET', `/goals/${id}/asset_role_teams`);
    return this.validateListResponse<unknown>(response, 'asset_role_goal_teams', 'listGoalAccessTeams');
  }

  async grantGoalAccessTeam(id: GoalId, teamId: TeamId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('POST', `/goals/${id}/asset_role_teams`, { data: { team_id: teamId, asset_role_id: assetRoleId } });
  }

  async revokeGoalAccessTeam(id: GoalId, teamId: TeamId, assetRoleId: AssetRoleId): Promise<void> {
    await this.request('DELETE', `/goals/${id}/asset_role_teams/${teamId}/${assetRoleId}`);
  }

  async listAssetRoles(): Promise<AssetRole[]> {
    const response = await this.request('GET', '/asset_roles');
    return this.validateListResponse<AssetRole>(response, 'asset_roles', 'listAssetRoles');
  }

  async getAssetRole(id: AssetRoleId): Promise<AssetRole> {
    const response = await this.request('GET', `/asset_roles/${id}`);
    return this.validateEntityResponse<AssetRole>(response, 'asset_role', 'getAssetRole');
  }

  async createAssetRole(data: { name: string; [key: string]: unknown }): Promise<AssetRole> {
    const response = await this.request('POST', '/asset_roles', { data });
    return this.validateEntityResponse<AssetRole>(response, 'asset_role', 'createAssetRole');
  }

  async updateAssetRole(id: AssetRoleId, data: Record<string, unknown>): Promise<AssetRole> {
    const response = await this.request('PUT', `/asset_roles/${id}`, { data: { data } });
    return this.validateEntityResponse<AssetRole>(response, 'asset_role', 'updateAssetRole');
  }

  async deleteAssetRole(id: AssetRoleId): Promise<void> {
    const response = await this.request('DELETE', `/asset_roles/${id}`);
    this.validateOkResponse(response, 'deleteAssetRole');
  }

  async requestMetricReview(id: MetricId): Promise<void> {
    const response = await this.request('POST', `/metrics/${id}/review/request`);
    this.validateOkResponse(response, 'requestMetricReview');
  }

  async getMetricReview(id: MetricId): Promise<unknown> {
    const response = await this.request('GET', `/metrics/${id}/review`);
    this.validateOkResponse(response, 'getMetricReview');
    return response.data;
  }

  async approveMetricReview(id: MetricId): Promise<void> {
    const response = await this.request('POST', `/metrics/${id}/review/approve`);
    this.validateOkResponse(response, 'approveMetricReview');
  }

  async listMetricReviewComments(id: MetricId): Promise<unknown[]> {
    const response = await this.request('GET', `/metrics/${id}/review/comments`);
    return this.validateListResponse<unknown>(response, 'comments', 'listMetricReviewComments');
  }

  async addMetricReviewComment(id: MetricId, message: string): Promise<unknown> {
    const response = await this.request('POST', `/metrics/${id}/review/comments`, { data: { message } });
    return response.data;
  }

  async replyToMetricReviewComment(id: MetricId, commentId: number, message: string): Promise<unknown> {
    const response = await this.request('POST', `/metrics/${id}/review/comments/${commentId}/reply`, { data: { message } });
    return response.data;
  }

  async createApplication(data: { name: string; [key: string]: unknown }): Promise<Application> {
    const response = await this.request('POST', '/applications', { data });
    return this.validateEntityResponse<Application>(response, 'application', 'createApplication');
  }

  async updateApplication(id: ApplicationId, data: Record<string, unknown>): Promise<Application> {
    const response = await this.request('PUT', `/applications/${id}`, { data: { data } });
    return this.validateEntityResponse<Application>(response, 'application', 'updateApplication');
  }

  async archiveApplication(id: ApplicationId, unarchive = false): Promise<void> {
    await this.request('PUT', `/applications/${id}/archive`, { data: { archive: !unarchive } });
  }

  async createEnvironment(data: { name: string; [key: string]: unknown }): Promise<Environment> {
    const response = await this.request('POST', '/environments', { data });
    return this.validateEntityResponse<Environment>(response, 'environment', 'createEnvironment');
  }

  async updateEnvironment(id: EnvironmentId, data: Record<string, unknown>): Promise<Environment> {
    const response = await this.request('PUT', `/environments/${id}`, { data: { data } });
    return this.validateEntityResponse<Environment>(response, 'environment', 'updateEnvironment');
  }

  async archiveEnvironment(id: EnvironmentId, unarchive = false): Promise<void> {
    await this.request('PUT', `/environments/${id}/archive`, { data: { archive: !unarchive } });
  }

  async createUnitType(data: { name: string; [key: string]: unknown }): Promise<UnitType> {
    const response = await this.request('POST', '/unit_types', { data });
    return this.validateEntityResponse<UnitType>(response, 'unit_type', 'createUnitType');
  }

  async updateUnitType(id: UnitTypeId, data: Record<string, unknown>): Promise<UnitType> {
    const response = await this.request('PUT', `/unit_types/${id}`, { data: { data } });
    return this.validateEntityResponse<UnitType>(response, 'unit_type', 'updateUnitType');
  }

  async archiveUnitType(id: UnitTypeId, unarchive = false): Promise<void> {
    await this.request('PUT', `/unit_types/${id}/archive`, { data: { archive: !unarchive } });
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
