export async function resolveBySearch<T extends { id: number }>(
  queries: string[],
  searchFn: (query: string) => Promise<T[]>,
): Promise<T[]> {
  const seen = new Set<number>();
  const results: T[] = [];
  const uniqueQueries = [...new Set(queries.filter(q => isNaN(parseInt(q, 10))))];
  const batches = await Promise.all(uniqueQueries.map(searchFn));
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
