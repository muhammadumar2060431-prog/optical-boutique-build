/**
 * RequireAdmin — Security guard component
 * Renders children ONLY if user is authenticated as admin.
 * Used as a secondary layer of protection in all admin child routes.
 */
import { useStore } from "@/lib/store";

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { isAdmin } = useStore();

  if (!isAdmin) {
    // Hard block: show nothing and do not render any admin content
    return (
      <div className="grid min-h-[60vh] place-items-center text-center p-8">
        <div className="space-y-3">
          <p className="text-2xl font-display">🔒 Access Denied</p>
          <p className="text-sm text-ink-muted">
            You must be logged in as admin to view this page.
          </p>
          <a
            href="/admin"
            className="inline-block mt-4 rounded-full bg-jet text-cream px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-jet/80 transition-colors"
          >
            Go to Admin Login
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
