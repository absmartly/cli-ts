/**
 * Compatibility layer between OpenAPI types and simplified CLI types
 *
 * The OpenAPI schema has strict types with many required fields.
 * This file provides simplified interfaces for CLI use while maintaining
 * type safety through mapped types.
 */

import type {
  Experiment as OpenAPIExperiment,
  ExperimentVariant as OpenAPIVariant,
  ExperimentNote as OpenAPINote,
} from './openapi-types.js';

// Simplified Experiment type for CLI operations
// Maps from strict OpenAPI type to optional fields for easier use
export type Experiment = Partial<OpenAPIExperiment> & {
  id: number;
  name: string;
};

// Simplified Variant type - OpenAPI uses string for config
export type Variant = {
  name: string;
  config?: string | object; // CLI accepts both
  variant?: number;
  experiment_id?: number;
};

// Simplified Note type
export type Note = Partial<OpenAPINote> & {
  id: number;
  text?: string;
  action?: string;
  created_at?: string;
};

// Helper to convert CLI variant to OpenAPI variant
export function toOpenAPIVariant(variant: Variant, variantNumber: number): OpenAPIVariant {
  return {
    experiment_id: variant.experiment_id,
    variant: variantNumber,
    name: variant.name,
    config: typeof variant.config === 'string' ? variant.config : JSON.stringify(variant.config || {}),
  };
}

// Helper to convert OpenAPI variant to CLI variant
export function fromOpenAPIVariant(variant: OpenAPIVariant): Variant {
  return {
    name: variant.name,
    variant: variant.variant,
    experiment_id: variant.experiment_id,
    config: variant.config,
  };
}
