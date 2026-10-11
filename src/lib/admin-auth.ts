export class AdminAuthError extends Error {
  retryAfter: number | undefined;

  constructor(message: string, code = "AuthRequestError", retryAfter?: number) {
    super(message);
    this.name = code;
    this.retryAfter = retryAfter;
  }
}

export async function postAdminAuth<T>(
  path: string,
  body: unknown,
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json()) as T & {
      error?: { code?: string; message?: string; retryAfter?: number };
    };
    if (!response.ok) {
      const retryAfter = payload.error?.retryAfter;
      const message = payload.error?.message ?? "Authentication is temporarily unavailable.";
      throw new AdminAuthError(
        retryAfter ? `${message} Try again in ${Math.ceil(retryAfter / 60)} minute(s).` : message,
        payload.error?.code,
        retryAfter,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof AdminAuthError) throw error;
    throw new AdminAuthError(
      controller.signal.aborted
        ? "Sign-in request timed out. Please check your connection and try again."
        : "Unable to reach authentication. Please check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
