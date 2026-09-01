import { useState } from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  Boxes,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
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

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — OPTIQUE Control Panel" },
      { name: "description", content: "Manage OPTIQUE products, orders, inventory and content." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — OPTIQUE Control Panel" },
      { property: "og:description", content: "Internal control panel for the OPTIQUE store." },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes, exact: false },
  { to: "/admin/content", label: "Content", icon: ImageIcon, exact: false },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote, exact: false },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, exact: false },
] as const;

function AdminLayout() {
  const { isAdmin, logout, settings } = useStore();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return <AdminLogin />;

  return (
    <div className="flex min-h-screen flex-col bg-mist lg:flex-row">
      <aside className="flex flex-col bg-sidebar text-sidebar-foreground lg:w-64">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-5">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/70">
              <span className="h-2.5 w-2.5 rounded-full bg-gold" />
            </span>
            <span className="truncate font-display text-xl tracking-[0.2em]">
              {settings.storeName}
            </span>
          </Link>
          <button
            type="button"
            aria-label="Toggle admin menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 lg:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        <nav aria-label="Admin sections" className={cn("px-3 pb-4 lg:block", open ? "block" : "hidden")}>
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: item.exact }}
                  activeProps={{ className: "bg-sidebar-accent text-gold-soft", "aria-current": "page" }}
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-gold-soft"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={logout}
            className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/60 transition-colors hover:text-gold-soft"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
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

  return (
    <div className="grid min-h-screen place-items-center bg-jet px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!login(email, password)) setError("Those credentials don't match our records.");
          else setError("");
        }}
        className="w-full max-w-sm space-y-5 rounded-xl border border-white/10 bg-card p-8"
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
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="min-h-11 w-full rounded-full">
          Enter
        </Button>
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Demo credentials — <strong>admin@optique.com</strong> / <strong>optique123</strong>
        </p>
      </form>
    </div>
  );
}
