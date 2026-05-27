export const mapWithConcurrency = async <T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
};
