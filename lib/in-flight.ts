/** Share overlapping reads only; never cache completed responses or failures. */
export function inFlightReads() {
  const pending = new Map<string, Promise<unknown>>();
  return function read<T>(key: string, request: () => Promise<T>): Promise<T> {
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const promise = Promise.resolve().then(request).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };
}
