export interface CheckoutAttempt<T> {
  intent: string;
  key: string;
  payload: T;
}

export function reuseCheckoutAttempt<T>(
  intent: string,
  previous: CheckoutAttempt<T> | null,
  create: () => T,
): CheckoutAttempt<T> {
  if (previous?.intent === intent) return previous;
  return { intent, key: `checkout:${crypto.randomUUID()}`, payload: create() };
}

export async function stableCheckoutOrderIds(key: string, count: number): Promise<string[]> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const prefix = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  return Array.from({ length: count }, (_, index) => `ord-${prefix}-${index}`);
}
