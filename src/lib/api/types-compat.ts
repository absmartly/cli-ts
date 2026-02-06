import type {
  Experiment as OpenAPIExperiment,
  ExperimentVariant as OpenAPIVariant,
  ExperimentNote as OpenAPINote,
} from './openapi-types.js';

export type Experiment = Partial<OpenAPIExperiment> & {
  id: number;
  name: string;
};

export type Variant = {
  name: string;
  config?: string | object;
  variant?: number;
  experiment_id?: number;
};

export type Note = Partial<OpenAPINote> & {
  id: number;
  text?: string;
  action?: string;
  created_at?: string;
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
    experiment_id: variant.experiment_id,
    config: variant.config,
  };
}
