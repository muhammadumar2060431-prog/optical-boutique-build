export const ADMIN_INACTIVITY_MS = 10 * 60 * 1_000;

export function isAdminActivityExpired(lastActivity: number, now = Date.now()) {
  return (
    !Number.isFinite(lastActivity) || lastActivity <= 0 || now - lastActivity >= ADMIN_INACTIVITY_MS
  );
}
