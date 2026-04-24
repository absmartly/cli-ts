// Shared camelCase → snake_case mapping for metric fields, used by both
// createMetric (fresh metric) and createMetricVersion (new draft version).

export interface MetricFields {
  name?: string | undefined;
  type?: string | undefined;
  description?: string | undefined;
  effect?: string | undefined;
  goalId?: number | undefined;
  owner?: number | undefined;

  formatStr?: string | undefined;
  scale?: number | undefined;
  precision?: number | undefined;
  meanFormatStr?: string | undefined;
  meanScale?: number | undefined;
  meanPrecision?: number | undefined;

  outlierLimitMethod?: string | undefined;
  valueSourceProperty?: string | undefined;
  propertyFilter?: unknown | undefined;

  // Numerator-side details (also used when the metric type itself is
  // goal_retention / goal_activity_period_count / custom_sql).
  retentionTime?: string | undefined;
  retentionTimeReference?: string | undefined;
  activityInterval?: string | undefined;
  customSql?: string | undefined;
  customStatisticsType?: string | undefined;
  vrLookbackInterval?: string | undefined;
  relationKind?: string | undefined;
  relationRefundOperation?: string | undefined;
  relationForeignDuplicateOperation?: string | undefined;

  // Denominator-side — only meaningful for goal_ratio.
  numeratorType?: string | undefined;
  denominatorType?: string | undefined;
  denominatorGoalId?: number | undefined;
  denominatorValueSourceProperty?: string | undefined;
  denominatorPropertyFilter?: unknown | undefined;
  denominatorOutlierLimitMethod?: string | undefined;
  denominatorRetentionTime?: string | undefined;
  denominatorRetentionTimeReference?: string | undefined;
  denominatorActivityInterval?: string | undefined;
  denominatorCustomSql?: string | undefined;
  denominatorCustomStatisticsType?: string | undefined;
  denominatorVrLookbackInterval?: string | undefined;
  denominatorRelationKind?: string | undefined;
  denominatorRelationRefundOperation?: string | undefined;
  denominatorRelationForeignDuplicateOperation?: string | undefined;

  ratioCondition?: string | undefined;
}

export function buildMetricPayload(fields: MetricFields): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) data[key] = value;
  };

  set('name', fields.name);
  set('type', fields.type);
  set('description', fields.description);
  set('effect', fields.effect);
  set('goal_id', fields.goalId);
  if (fields.owner !== undefined) data.owners = [{ user_id: fields.owner }];

  set('format_str', fields.formatStr);
  set('scale', fields.scale);
  set('precision', fields.precision);
  set('mean_format_str', fields.meanFormatStr);
  set('mean_scale', fields.meanScale);
  set('mean_precision', fields.meanPrecision);

  set('outlier_limit_method', fields.outlierLimitMethod);
  set('value_source_property', fields.valueSourceProperty);
  set('property_filter', fields.propertyFilter);

  set('retention_time', fields.retentionTime);
  set('retention_time_reference', fields.retentionTimeReference);
  set('activity_interval', fields.activityInterval);
  set('custom_sql', fields.customSql);
  set('custom_statistics_type', fields.customStatisticsType);
  set('vr_lookback_interval', fields.vrLookbackInterval);
  set('relation_kind', fields.relationKind);
  set('relation_refund_operation', fields.relationRefundOperation);
  set('relation_foreign_duplicate_operation', fields.relationForeignDuplicateOperation);

  set('numerator_type', fields.numeratorType);
  set('denominator_type', fields.denominatorType);
  set('denominator_goal_id', fields.denominatorGoalId);
  set('denominator_value_source_property', fields.denominatorValueSourceProperty);
  set('denominator_property_filter', fields.denominatorPropertyFilter);
  set('denominator_outlier_limit_method', fields.denominatorOutlierLimitMethod);
  set('denominator_retention_time', fields.denominatorRetentionTime);
  set('denominator_retention_time_reference', fields.denominatorRetentionTimeReference);
  set('denominator_activity_interval', fields.denominatorActivityInterval);
  set('denominator_custom_sql', fields.denominatorCustomSql);
  set('denominator_custom_statistics_type', fields.denominatorCustomStatisticsType);
  set('denominator_vr_lookback_interval', fields.denominatorVrLookbackInterval);
  set('denominator_relation_kind', fields.denominatorRelationKind);
  set('denominator_relation_refund_operation', fields.denominatorRelationRefundOperation);
  set(
    'denominator_relation_foreign_duplicate_operation',
    fields.denominatorRelationForeignDuplicateOperation
  );

  set('ratio_condition', fields.ratioCondition);

  return data;
}
