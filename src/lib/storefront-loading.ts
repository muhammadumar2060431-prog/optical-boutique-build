import type { InitialSupabaseData } from "./supabaseSync.ts";

export function hasStorefrontContent(
  data: InitialSupabaseData | null | undefined,
): data is InitialSupabaseData {
  return Boolean(
    data &&
    Array.isArray(data.products) &&
    Array.isArray(data.categories) &&
    Array.isArray(data.collections) &&
    Array.isArray(data.heroSlides),
  );
}

// Bound the whole operation, including auth waits and response body reads.
export function withStorefrontTimeout<T>(request: PromiseLike<T>, timeoutMs = 6_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Storefront request timed out")), timeoutMs);
    Promise.resolve(request).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
