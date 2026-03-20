function extractSearchTerm(query: string): string {
  const emailInBrackets = /<(.+?)>/.exec(query);
  if (emailInBrackets) return emailInBrackets[1]!;
  return query;
}

export async function resolveBySearch<T extends { id: number }>(
  queries: string[],
  searchFn: (query: string) => Promise<T[]>,
): Promise<T[]> {
  const seen = new Set<number>();
  const results: T[] = [];
  const searchTerms = [...new Set(
    queries
      .filter(q => isNaN(parseInt(q, 10)))
      .map(extractSearchTerm)
  )];
  const batches = await Promise.all(searchTerms.map(searchFn));
  for (const batch of batches) {
    for (const item of batch) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        results.push(item);
      }
    }
  }
  return results;
}
