import axios, { AxiosInstance, AxiosError } from 'axios';
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
  Alert,
  Note,
  APIError,
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

    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error: AxiosError) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status ?? 0) >= 500
        );
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
    apiError.statusCode = error.response?.status;
    apiError.response = error.response?.data;

    if (error.response?.status === 401) {
      apiError.message = 'unauthorized: invalid or expired API key';
    } else if (error.response?.status === 403) {
      apiError.message = 'forbidden: insufficient permissions';
    } else if (error.response?.status === 404) {
      apiError.message = 'not found';
    } else {
      apiError.message = error.message || 'API error';
    }

    return apiError;
  }

  async listExperiments(options: ListOptions = {}): Promise<Experiment[]> {
    const params: Record<string, string> = {};

    if (options.limit) params.limit = String(options.limit);
    if (options.offset) params.offset = String(options.offset);
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

    if (options.alert_srm) params.sample_ratio_mismatch = String(options.alert_srm);
    if (options.alert_cleanup_needed) params.cleanup_needed = String(options.alert_cleanup_needed);
    if (options.alert_audience_mismatch)
      params.audience_mismatch = String(options.alert_audience_mismatch);
    if (options.alert_sample_size_reached)
      params.sample_size_reached = String(options.alert_sample_size_reached);
    if (options.alert_experiments_interact)
      params.experiments_interact = String(options.alert_experiments_interact);
    if (options.alert_group_sequential_updated)
      params.group_sequential_updated = String(options.alert_group_sequential_updated);
    if (options.alert_assignment_conflict)
      params.assignment_conflict = String(options.alert_assignment_conflict);
    if (options.alert_metric_threshold_reached)
      params.metric_threshold_reached = String(options.alert_metric_threshold_reached);

    if (options.significance) params.significance = options.significance;

    const response = await this.client.get<{ experiments: Experiment[] }>('/experiments', {
      params,
    });
    return response.data.experiments;
  }

  async getExperiment(id: number): Promise<Experiment> {
    const response = await this.client.get<Experiment>(`/experiments/${id}`);
    return response.data;
  }

  async createExperiment(data: Partial<Experiment>): Promise<Experiment> {
    const response = await this.client.post<Experiment>('/experiments', data);
    return response.data;
  }

  async updateExperiment(id: number, data: Partial<Experiment>): Promise<Experiment> {
    const response = await this.client.put<Experiment>(`/experiments/${id}`, data);
    return response.data;
  }

  async deleteExperiment(id: number): Promise<void> {
    await this.client.delete(`/experiments/${id}`);
  }

  async startExperiment(id: number): Promise<Experiment> {
    const response = await this.client.post<Experiment>(`/experiments/${id}/start`);
    return response.data;
  }

  async stopExperiment(id: number): Promise<Experiment> {
    const response = await this.client.post<Experiment>(`/experiments/${id}/stop`);
    return response.data;
  }

  async archiveExperiment(id: number, unarchive = false): Promise<Experiment> {
    const response = await this.client.post<Experiment>(
      `/experiments/${id}/${unarchive ? 'unarchive' : 'archive'}`
    );
    return response.data;
  }

  async listExperimentAlerts(id: number): Promise<Alert[]> {
    const response = await this.client.get<{ alerts: Alert[] }>(`/experiments/${id}/alerts`);
    return response.data.alerts;
  }

  async deleteExperimentAlerts(id: number): Promise<void> {
    await this.client.delete(`/experiments/${id}/alerts`);
  }

  async listExperimentNotes(id: number): Promise<Note[]> {
    const response = await this.client.get<{ notes: Note[] }>(`/experiments/${id}/notes`);
    return response.data.notes;
  }

  async createExperimentNote(id: number, message: string): Promise<Note> {
    const response = await this.client.post<Note>(`/experiments/${id}/notes`, { text: message });
    return response.data;
  }

  async searchExperiments(query: string, limit = 50): Promise<Experiment[]> {
    return this.listExperiments({ search: query, limit });
  }

  async listGoals(limit = 100, offset = 0): Promise<Goal[]> {
    const response = await this.client.get<{ goals: Goal[] }>('/goals', {
      params: { limit, offset },
    });
    return response.data.goals;
  }

  async getGoal(id: number): Promise<Goal> {
    const response = await this.client.get<Goal>(`/goals/${id}`);
    return response.data;
  }

  async createGoal(data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.post<Goal>('/goals', data);
    return response.data;
  }

  async updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.put<Goal>(`/goals/${id}`, data);
    return response.data;
  }

  async deleteGoal(id: number): Promise<void> {
    await this.client.delete(`/goals/${id}`);
  }

  async listSegments(limit = 100, offset = 0): Promise<Segment[]> {
    const response = await this.client.get<{ segments: Segment[] }>('/segments', {
      params: { limit, offset },
    });
    return response.data.segments;
  }

  async getSegment(id: number): Promise<Segment> {
    const response = await this.client.get<Segment>(`/segments/${id}`);
    return response.data;
  }

  async createSegment(data: Partial<Segment>): Promise<Segment> {
    const response = await this.client.post<Segment>('/segments', data);
    return response.data;
  }

  async updateSegment(id: number, data: Partial<Segment>): Promise<Segment> {
    const response = await this.client.put<Segment>(`/segments/${id}`, data);
    return response.data;
  }

  async deleteSegment(id: number): Promise<void> {
    await this.client.delete(`/segments/${id}`);
  }

  async listTeams(includeArchived = false): Promise<Team[]> {
    const response = await this.client.get<{ teams: Team[] }>('/teams', {
      params: { include_archived: includeArchived ? '1' : '0' },
    });
    return response.data.teams;
  }

  async getTeam(id: number): Promise<Team> {
    const response = await this.client.get<Team>(`/teams/${id}`);
    return response.data;
  }

  async createTeam(data: Partial<Team>): Promise<Team> {
    const response = await this.client.post<Team>('/teams', data);
    return response.data;
  }

  async updateTeam(id: number, data: Partial<Team>): Promise<Team> {
    const response = await this.client.put<Team>(`/teams/${id}`, data);
    return response.data;
  }

  async archiveTeam(id: number, unarchive = false): Promise<Team> {
    const response = await this.client.post<Team>(
      `/teams/${id}/${unarchive ? 'unarchive' : 'archive'}`
    );
    return response.data;
  }

  async listUsers(includeArchived = false): Promise<User[]> {
    const response = await this.client.get<{ users: User[] }>('/users', {
      params: { include_archived: includeArchived ? '1' : '0' },
    });
    return response.data.users;
  }

  async getUser(id: number): Promise<User> {
    const response = await this.client.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(data: Partial<User>): Promise<User> {
    const response = await this.client.post<User>('/users', data);
    return response.data;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const response = await this.client.put<User>(`/users/${id}`, data);
    return response.data;
  }

  async archiveUser(id: number, unarchive = false): Promise<User> {
    const response = await this.client.post<User>(
      `/users/${id}/${unarchive ? 'unarchive' : 'archive'}`
    );
    return response.data;
  }

  async listMetrics(limit = 100, offset = 0): Promise<Metric[]> {
    const response = await this.client.get<{ metrics: Metric[] }>('/metrics', {
      params: { limit, offset },
    });
    return response.data.metrics;
  }

  async getMetric(id: number): Promise<Metric> {
    const response = await this.client.get<Metric>(`/metrics/${id}`);
    return response.data;
  }

  async createMetric(data: Partial<Metric>): Promise<Metric> {
    const response = await this.client.post<Metric>('/metrics', data);
    return response.data;
  }

  async updateMetric(id: number, data: Partial<Metric>): Promise<Metric> {
    const response = await this.client.put<Metric>(`/metrics/${id}`, data);
    return response.data;
  }

  async archiveMetric(id: number, unarchive = false): Promise<Metric> {
    const response = await this.client.post<Metric>(
      `/metrics/${id}/${unarchive ? 'unarchive' : 'archive'}`
    );
    return response.data;
  }

  async listApplications(): Promise<Application[]> {
    const response = await this.client.get<{ applications: Application[] }>('/applications');
    return response.data.applications;
  }

  async getApplication(id: number): Promise<Application> {
    const response = await this.client.get<Application>(`/applications/${id}`);
    return response.data;
  }

  async listEnvironments(): Promise<Environment[]> {
    const response = await this.client.get<{ environments: Environment[] }>('/environments');
    return response.data.environments;
  }

  async getEnvironment(id: number): Promise<Environment> {
    const response = await this.client.get<Environment>(`/environments/${id}`);
    return response.data;
  }

  async listUnitTypes(): Promise<UnitType[]> {
    const response = await this.client.get<{ unit_types: UnitType[] }>('/unit-types');
    return response.data.unit_types;
  }

  async getUnitType(id: number): Promise<UnitType> {
    const response = await this.client.get<UnitType>(`/unit-types/${id}`);
    return response.data;
  }

  async listExperimentTags(limit = 100, offset = 0): Promise<ExperimentTag[]> {
    const response = await this.client.get<{ experiment_tags: ExperimentTag[] }>(
      '/experiment_tags',
      {
        params: { limit, offset },
      }
    );
    return response.data.experiment_tags;
  }

  async getExperimentTag(id: number): Promise<ExperimentTag> {
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

  async updateExperimentTag(id: number, data: { tag: string }): Promise<ExperimentTag> {
    const response = await this.client.put<{ experiment_tag: ExperimentTag }>(
      `/experiment_tags/${id}`,
      data
    );
    return response.data.experiment_tag;
  }

  async deleteExperimentTag(id: number): Promise<void> {
    await this.client.delete(`/experiment_tags/${id}`);
  }

  async listGoalTags(limit = 100, offset = 0): Promise<GoalTag[]> {
    const response = await this.client.get<{ goal_tags: GoalTag[] }>('/goal_tags', {
      params: { limit, offset },
    });
    return response.data.goal_tags;
  }

  async getGoalTag(id: number): Promise<GoalTag> {
    const response = await this.client.get<{ goal_tag: GoalTag }>(`/goal_tags/${id}`);
    return response.data.goal_tag;
  }

  async createGoalTag(data: { tag: string }): Promise<GoalTag> {
    const response = await this.client.post<{ goal_tag: GoalTag }>('/goal_tags', data);
    return response.data.goal_tag;
  }

  async updateGoalTag(id: number, data: { tag: string }): Promise<GoalTag> {
    const response = await this.client.put<{ goal_tag: GoalTag }>(`/goal_tags/${id}`, data);
    return response.data.goal_tag;
  }

  async deleteGoalTag(id: number): Promise<void> {
    await this.client.delete(`/goal_tags/${id}`);
  }

  async listMetricTags(limit = 100, offset = 0): Promise<MetricTag[]> {
    const response = await this.client.get<{ metric_tags: MetricTag[] }>('/metric_tags', {
      params: { limit, offset },
    });
    return response.data.metric_tags;
  }

  async getMetricTag(id: number): Promise<MetricTag> {
    const response = await this.client.get<{ metric_tag: MetricTag }>(`/metric_tags/${id}`);
    return response.data.metric_tag;
  }

  async createMetricTag(data: { tag: string }): Promise<MetricTag> {
    const response = await this.client.post<{ metric_tag: MetricTag }>('/metric_tags', data);
    return response.data.metric_tag;
  }

  async updateMetricTag(id: number, data: { tag: string }): Promise<MetricTag> {
    const response = await this.client.put<{ metric_tag: MetricTag }>(`/metric_tags/${id}`, data);
    return response.data.metric_tag;
  }

  async deleteMetricTag(id: number): Promise<void> {
    await this.client.delete(`/metric_tags/${id}`);
  }

  async listMetricCategories(limit = 100, offset = 0): Promise<MetricCategory[]> {
    const response = await this.client.get<{ metric_categories: MetricCategory[] }>(
      '/metric_categories',
      {
        params: { limit, offset },
      }
    );
    return response.data.metric_categories;
  }

  async getMetricCategory(id: number): Promise<MetricCategory> {
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
    id: number,
    data: { name?: string; description?: string; color?: string }
  ): Promise<MetricCategory> {
    const response = await this.client.put<{ metric_category: MetricCategory }>(
      `/metric_categories/${id}`,
      data
    );
    return response.data.metric_category;
  }

  async archiveMetricCategory(id: number, archive = true): Promise<void> {
    await this.client.put(`/metric_categories/${id}/archive`, { archive });
  }

  async listRoles(limit = 20, offset = 0): Promise<Role[]> {
    const response = await this.client.get<{ roles: Role[] }>('/roles', {
      params: { limit, offset },
    });
    return response.data.roles;
  }

  async getRole(id: number): Promise<Role> {
    const response = await this.client.get<Role>(`/roles/${id}`);
    return response.data;
  }

  async createRole(data: Partial<Role>): Promise<Role> {
    const response = await this.client.post<Role>('/roles', data);
    return response.data;
  }

  async updateRole(id: number, data: Partial<Role>): Promise<Role> {
    const response = await this.client.put<Role>(`/roles/${id}`, data);
    return response.data;
  }

  async deleteRole(id: number): Promise<void> {
    await this.client.delete(`/roles/${id}`);
  }

  async listPermissions(): Promise<Permission[]> {
    const response = await this.client.get<{ permissions: Permission[] }>('/permissions');
    return response.data.permissions;
  }

  async listPermissionCategories(): Promise<PermissionCategory[]> {
    const response = await this.client.get<{ permission_categories: PermissionCategory[] }>(
      '/permission_categories'
    );
    return response.data.permission_categories;
  }

  async listApiKeys(limit = 20, offset = 0): Promise<ApiKey[]> {
    const response = await this.client.get<{ api_keys: ApiKey[] }>('/api_keys', {
      params: { limit, offset },
    });
    return response.data.api_keys;
  }

  async getApiKey(id: number): Promise<ApiKey> {
    const response = await this.client.get<ApiKey>(`/api_keys/${id}`);
    return response.data;
  }

  async createApiKey(data: Partial<ApiKey>): Promise<ApiKey> {
    const response = await this.client.post<ApiKey>('/api_keys', data);
    return response.data;
  }

  async updateApiKey(id: number, data: Partial<ApiKey>): Promise<ApiKey> {
    const response = await this.client.put<ApiKey>(`/api_keys/${id}`, data);
    return response.data;
  }

  async deleteApiKey(id: number): Promise<void> {
    await this.client.delete(`/api_keys/${id}`);
  }

  async listWebhooks(limit = 20, offset = 0): Promise<Webhook[]> {
    const response = await this.client.get<{ webhooks: Webhook[] }>('/webhooks', {
      params: { limit, offset },
    });
    return response.data.webhooks;
  }

  async getWebhook(id: number): Promise<Webhook> {
    const response = await this.client.get<Webhook>(`/webhooks/${id}`);
    return response.data;
  }

  async createWebhook(data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.client.post<Webhook>('/webhooks', data);
    return response.data;
  }

  async updateWebhook(id: number, data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.client.put<Webhook>(`/webhooks/${id}`, data);
    return response.data;
  }

  async deleteWebhook(id: number): Promise<void> {
    await this.client.delete(`/webhooks/${id}`);
  }

  async rawRequest(
    path: string,
    method = 'GET',
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<unknown> {
    const response = await this.client.request({
      url: path,
      method,
      data,
      headers,
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
