export interface StorageCleanupBackend {
  claim(): Promise<string[]>;
  remove(paths: string[]): Promise<void>;
  exists(path: string): Promise<boolean>;
  finish(paths: string[], error: string | null): Promise<void>;
}

export async function processStorageCleanup(backend: StorageCleanupBackend) {
  const paths = await backend.claim();
  if (!paths.length) return { claimed: 0, removed: 0, retrying: 0 };
  try {
    await backend.remove(paths);
  } catch {
    await backend.finish(paths, "Storage removal failed; retry required.");
    return { claimed: paths.length, removed: 0, retrying: paths.length };
  }
  const removed: string[] = [];
  const retrying: string[] = [];
  for (const path of paths) {
    try {
      if (await backend.exists(path)) retrying.push(path);
      else removed.push(path);
    } catch {
      retrying.push(path);
    }
  }
  if (removed.length) await backend.finish(removed, null);
  if (retrying.length)
    await backend.finish(retrying, "Removal could not be confirmed; retry required.");
  return { claimed: paths.length, removed: removed.length, retrying: retrying.length };
}
