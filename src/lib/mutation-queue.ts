export function createMutationQueue() {
  const pending = new Map<string, Promise<unknown>>();
  return function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = pending.get(key) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(operation)
      .finally(() => {
        if (pending.get(key) === current) pending.delete(key);
      });
    pending.set(key, current);
    return current;
  };
}
