import type {
  Experiment as OpenAPIExperiment,
  ExperimentVariant as OpenAPIVariant,
  ExperimentNote as OpenAPINote,
} from './openapi-types.js';
import type {
  ExperimentId,
  UserId,
  UnitTypeId,
  ApplicationId,
  EnvironmentId,
  TeamId,
  NoteId,
} from './branded-types.js';

export type Experiment = Partial<OpenAPIExperiment> & {
  id: ExperimentId;
  name: string;
  unit_type_id?: UnitTypeId;
  application_id?: ApplicationId;
  environment_id?: EnvironmentId;
  owner_id?: UserId;
  team_id?: TeamId;
};

export type Variant = {
  name: string;
  config?: string | object;
  variant?: number;
  experiment_id?: ExperimentId;
};

export type Note = Partial<OpenAPINote> & {
  id: NoteId;
  experiment_id?: ExperimentId;
  text?: string;
  action?: string;
  created_at?: string;
  created_by_user_id?: UserId;
};

export function toOpenAPIVariant(variant: Variant, variantNumber: number): OpenAPIVariant {
  return {
    experiment_id: variant.experiment_id,
    variant: variantNumber,
    name: variant.name,
    config: typeof variant.config === 'string' ? variant.config : JSON.stringify(variant.config || {}),
  };
}

export function fromOpenAPIVariant(variant: OpenAPIVariant): Variant {
  return {
    name: variant.name,
    variant: variant.variant,
    experiment_id: variant.experiment_id as ExperimentId | undefined,
    config: variant.config,
  };
}
