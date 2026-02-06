/**
 * Common validation functions for CLI inputs
 */

/**
 * Parse and validate a resource ID
 * @throws Error if value is not a positive integer
 */
export function parseId(value: string): number {
  const id = parseInt(value, 10);

  if (isNaN(id)) {
    throw new Error(`Invalid ID: "${value}" -- must be a number`);
  }

  if (id <= 0) {
    throw new Error(`Invalid ID: ${id} -- must be a positive integer`);
  }

  if (!Number.isInteger(id)) {
    throw new Error(`Invalid ID: ${id} -- must be an integer`);
  }

  return id;
}

/**
 * Validate that at least one field is provided in an update object
 * @throws Error if object is empty
 */
export function requireAtLeastOneField(
  data: Record<string, unknown>,
  fieldName = 'field'
): void {
  const providedFields = Object.keys(data).filter((key) => data[key] !== undefined);

  if (providedFields.length === 0) {
    throw new Error(
      `At least one ${fieldName} must be provided for update.\n` +
        `Use --help to see available options.`
    );
  }
}

/**
 * Validate JSON string
 * @throws Error with helpful message if JSON is invalid
 */
export function validateJSON(jsonString: string, context = 'JSON'): unknown {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${context}: ${error instanceof Error ? error.message : 'unknown error'}\n` +
        `\n` +
        `Input: ${jsonString.substring(0, 100)}${jsonString.length > 100 ? '...' : ''}`
    );
  }
}
