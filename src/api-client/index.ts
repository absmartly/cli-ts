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
export { buildExperimentPayload, type BuildPayloadResult } from './payload/builder.js';
export { resolveBySearch } from './payload/search-resolver.js';
export { buildSecondaryMetrics, type SecondaryMetricEntry } from './payload/metrics-builder.js';
export { parseCSV } from './payload/parse-csv.js';

export { experimentToMarkdown, type SerializerOptions } from './template/serializer.js';
export { buildPayloadFromTemplate } from './template/build-from-template.js';

export {
  formatExtraField,
  formatImpact,
  formatConfidence,
  formatProgress,
  renderCIBar,
  formatPct,
} from './format-helpers.js';

export {
  summarizeExperiment,
  summarizeExperimentRow,
  stateToDate,
} from './experiment-summary.js';

export type { UserSummary } from './user-summary.js';
export { summarizeUser } from './user-summary.js';

export type { MetricResult, MetricInfo } from './metric-results.js';
export {
  parseMetricData,
  formatResultRow,
  formatResultRows,
  metricOwners,
  extractMetricInfos,
  extractVariantNames,
  fetchAllMetricResults,
} from './metric-results.js';

export type { CreateFromOptionsInput } from './payload/build-from-options.js';
export { buildPayloadFromOptions } from './payload/build-from-options.js';

export { mergeTemplateOverrides } from './template/merge-overrides.js';
