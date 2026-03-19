export type {
  HttpClient,
  HttpRequestConfig,
  HttpResponse,
  APIError,
} from './http-client.js';

export { APIClient, createAPIClient } from './api-client.js';

export { experimentToInput } from './experiment-transform.js';
export type { ExperimentInput } from './experiment-transform.js';

export {
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
  Timestamp,
  TrafficPercentage,
  JSONConfig,
  ProfileName,
} from './types.js';

export type {
  ExperimentStrict,
  ExperimentShortStrict,
  VariantStrict,
  NoteStrict,
  Experiment,
  ExperimentShort,
  Variant,
  Note,
  ExperimentTag,
  Goal,
  GoalTag,
  Segment,
  Team,
  User,
  Metric,
  MetricTag,
  MetricCategory,
  Application,
  Environment,
  UnitType,
  Role,
  Permission,
  Webhook,
  ScheduledAction,
  Alert,
  ExperimentApplication,
  ExperimentCustomFieldValue,
  CustomSectionField,
  PermissionCategory,
  ListOptions,
  APIKey,
} from './types.js';

export type {
  VariantTemplate,
  ExperimentTemplate,
} from './template/parser.js';

export { parseExperimentMarkdown } from './template/parser.js';

export type {
  GeneratorContext,
  GeneratorOptions,
} from './template/generator.js';

export { generateTemplate } from './template/generator.js';

export type { ResolverContext } from './payload/resolver.js';
export { resolveByName } from './payload/resolver.js';
export { buildExperimentPayload } from './payload/builder.js';
