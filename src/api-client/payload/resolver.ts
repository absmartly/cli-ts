export interface ResolverContext {
  applications: Array<{ id: number; name: string }>;
  unitTypes: Array<{ id: number; name: string }>;
  metrics: Array<{ id: number; name: string }>;
  goals: Array<{ id: number; name: string }>;
  customSectionFields?: Array<{
    id: number;
    name?: string;
    title?: string;
    type: string;
    default_value?: string;
    archived?: boolean;
    custom_section?: { type?: string; archived?: boolean };
  }>;
}

export function resolveByName<T extends { id: number; name: string }>(
  items: T[],
  nameOrId: string,
  entityType: string,
): T {
  const trimmed = nameOrId.trim();
  const asInt = parseInt(trimmed, 10);

  if (!isNaN(asInt) && String(asInt) === trimmed) {
    const byId = items.find((item) => item.id === asInt);
    if (byId) {
      return byId;
    }
    const availableNames = items.map((item) => `"${item.name}" (id: ${item.id})`).join(', ');
    throw new Error(
      `${entityType} with ID ${asInt} not found. Available: ${availableNames}`,
    );
  }

  const lowerName = trimmed.toLowerCase();
  const matches = items.filter((item) => item.name.toLowerCase() === lowerName);

  if (matches.length === 1) {
    return matches[0]!;
  }

  if (matches.length > 1) {
    const suggestions = matches.map((item) => `"${item.name}" (id: ${item.id})`).join(', ');
    throw new Error(
      `Multiple ${entityType} entries match "${trimmed}". Matches: ${suggestions}`,
    );
  }

  const availableNames = items.map((item) => `"${item.name}" (id: ${item.id})`).join(', ');
  throw new Error(
    `${entityType} "${trimmed}" not found. Available: ${availableNames}`,
  );
}
