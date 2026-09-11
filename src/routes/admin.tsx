import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  Boxes,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Quote,
  Settings as SettingsIcon,
  ShoppingCart,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — OPTIQUE Control Panel" },
      { name: "description", content: "Manage OPTIQUE products, orders, inventory and content." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — OPTIQUE Control Panel" },
      { property: "og:description", content: "Internal control panel for the OPTIQUE store." },
    ],
  }),
  notFoundComponent: AdminDashboard,
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { to: "/admin/queries", label: "Queries", icon: MessageSquare, exact: false },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes, exact: false },
  { to: "/admin/content", label: "Content", icon: ImageIcon, exact: false },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote, exact: false },
  { to: "/admin/faqs", label: "FAQs", icon: HelpCircle, exact: false },
  { to: "/admin/subscribers", label: "Subscribers", icon: Mail, exact: false },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, exact: false },
] as const;

function AdminLayout() {
  const { isAdmin, logout, settings } = useStore();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return <AdminLogin />;

  return (
    <div className="admin-portal flex min-h-screen flex-col bg-white lg:flex-row">
      <aside className="flex flex-col bg-sidebar text-sidebar-foreground lg:w-64 border-r border-stone/20">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-5">
          <Link to="/" className="flex items-center" aria-label={settings.storeName}>
            <img
              src="/brand-logo.png"
              alt={settings.storeName}
              className="h-12 w-auto object-contain shrink-0 invert"
            />
          </Link>
          <button
            type="button"
            aria-label="Toggle admin menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav
          aria-label="Admin sections"
          className={cn("px-3 pb-4 lg:block", open ? "block" : "hidden")}
        >
          <ul className="space-y-1.5">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: item.exact }}
                  activeProps={{
                    className: "!bg-white !text-black shadow-sm font-bold",
                    "aria-current": "page",
                  }}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-white/15 hover:text-white"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={logout}
            className="mt-6 flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-sidebar-foreground/60 transition-all duration-200 hover:bg-destructive/15 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {/* Double-check auth on every render — prevents stale state bypass */}
          {isAdmin ? <Outlet /> : <AdminLogin />}
        </div>
      </div>
    </div>
  );
}

function AdminLogin() {
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);

  // ── Progressive lockout config ──────────────────────────────
  // Each tier: { minAttempts, lockSeconds }
  const LOCKOUT_TIERS = [
    { minAttempts: 3,  lockSeconds: 60 },        // 1 min
    { minAttempts: 5,  lockSeconds: 180 },       // 3 min
    { minAttempts: 7,  lockSeconds: 900 },       // 15 min
    { minAttempts: 10, lockSeconds: 3600 },      // 1 hour
    { minAttempts: 12, lockSeconds: 7200 },      // 2 hours
  ] as const;

  const LS_ATTEMPTS_KEY = "optique_admin_attempts";
  const LS_LOCKED_KEY   = "optique_admin_locked_until";

  // Read persisted state from localStorage
  const getStoredAttempts = () => parseInt(localStorage.getItem(LS_ATTEMPTS_KEY) || "0", 10);
  const getStoredLockedUntil = () => parseInt(localStorage.getItem(LS_LOCKED_KEY) || "0", 10);

  const [attempts, setAttempts] = useState<number>(() => getStoredAttempts());
  const [lockedUntil, setLockedUntil] = useState<number>(() => getStoredLockedUntil());

  const isLocked = lockedUntil > Date.now();

  // Persist whenever state changes
  const applyLockout = (newAttempts: number, lockSecs: number) => {
    const until = Date.now() + lockSecs * 1000;
    localStorage.setItem(LS_ATTEMPTS_KEY, String(newAttempts));
    localStorage.setItem(LS_LOCKED_KEY, String(until));
    setAttempts(newAttempts);
    setLockedUntil(until);
    setRemaining(lockSecs);
  };

  const clearLockout = () => {
    localStorage.setItem(LS_ATTEMPTS_KEY, "0");
    localStorage.setItem(LS_LOCKED_KEY, "0");
    setAttempts(0);
    setLockedUntil(0);
    setRemaining(0);
  };

  // Get lockout duration for given attempt count
  const getLockoutSeconds = (attempt: number): number | null => {
    // Find highest tier that applies
    let lockSecs: number | null = null;
    for (const tier of LOCKOUT_TIERS) {
      if (attempt >= tier.minAttempts) lockSecs = tier.lockSeconds;
    }
    return lockSecs;
  };

  // Human-readable lockout time
  const formatTime = (secs: number) => {
    if (secs >= 3600) return `${Math.ceil(secs / 3600)} ghanta`;
    if (secs >= 60)   return `${Math.ceil(secs / 60)} minute`;
    return `${secs} second`;
  };

  // Live countdown timer
  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockedUntil(0);
        setRemaining(0);
        clearInterval(interval);
      } else {
        setRemaining(left);
      }
    }, 500);
    // Set initial remaining on mount
    setRemaining(Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)));
    return () => clearInterval(interval);
  }, [isLocked, lockedUntil]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const ok = login(email, password);
    if (ok) {
      setError("");
      clearLockout();
    } else {
      const newAttempts = attempts + 1;
      localStorage.setItem(LS_ATTEMPTS_KEY, String(newAttempts));
      setAttempts(newAttempts);

      const lockSecs = getLockoutSeconds(newAttempts);
      if (lockSecs !== null) {
        applyLockout(newAttempts, lockSecs);
        setError(
          `Zyada galt koshishain! ${formatTime(lockSecs)} ke liye block kar diya gaya hai.`
        );
      } else {
        // Not yet locked — warn with attempts remaining until next tier
        const nextTier = LOCKOUT_TIERS.find((t) => t.minAttempts > newAttempts);
        const attemptsUntilLock = nextTier ? nextTier.minAttempts - newAttempts : 1;
        setError(
          `Galt email ya password. ${attemptsUntilLock} galat koshish aur — phr ${
            nextTier ? formatTime(nextTier.lockSeconds) : "block"
          } ke liye lock ho jaega.`
        );
      }
    }
  };

  // Format remaining time nicely
  const remainingText = () => {
    if (remaining >= 3600) return `${Math.ceil(remaining / 3600)}h ${Math.ceil((remaining % 3600) / 60)}m`;
    if (remaining >= 60)   return `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
    return `${remaining}s`;
  };

  return (
    <div className="grid min-h-screen place-items-center bg-jet px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-white/10 bg-card p-8"
        autoComplete="off"
      >
        <div className="space-y-1">
          <p className="eyebrow text-gold-soft">Control panel</p>
          <h1 className="font-display text-3xl">Sign in</h1>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11"
            disabled={isLocked}
            required
            autoComplete="new-email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11"
            disabled={isLocked}
            required
            autoComplete="new-password"
          />
        </div>

        {/* Lockout Progress Indicator */}
        {isLocked && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-destructive uppercase tracking-wider">
                🔒 Account Blocked
              </p>
              <span className="text-xs font-mono font-bold text-destructive bg-destructive/20 px-2 py-0.5 rounded-full">
                {remainingText()}
              </span>
            </div>
            <p className="text-xs text-destructive/80">{error}</p>
            {/* Visual progress bar */}
            <div className="h-1.5 w-full rounded-full bg-destructive/20 overflow-hidden">
              <div
                className="h-full bg-destructive rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(0, Math.min(100, (remaining / (lockedUntil > 0 ? Math.max(60, Math.ceil((lockedUntil - (lockedUntil - remaining * 1000)) / 1000)) : 60)) * 100))}%`
                }}
              />
            </div>
            <p className="text-[10px] text-destructive/60">
              {attempts} galt koshishain ki gayi hain
            </p>
          </div>
        )}

        {/* Normal Error (not locked) */}
        {error && !isLocked && (
          <div className="rounded-md border border-amber-400/30 bg-amber-50/10 p-3 space-y-0.5">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{error}</p>
            {/* Attempt indicator dots */}
            <div className="flex items-center gap-1 pt-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    i < attempts ? "bg-destructive" : "bg-stone-300/40"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="min-h-11 w-full rounded-full"
          disabled={isLocked}
        >
          {isLocked ? `🔒 Blocked (${remainingText()})` : "Enter"}
        </Button>

        <div className="text-center pt-1">
          <Link to="/" className="text-xs text-sidebar-foreground/60 hover:text-white transition-colors">
            ← Return to Store
          </Link>
        </div>
      </form>
    </div>
  );
}
