import { useState } from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  Boxes,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  MessageSquare,
  Package,
  Quote,
  Settings as SettingsIcon,
  ShoppingCart,
  X,
} from "lucide-react";

import { AdminAuthPanel } from "@/components/admin/AdminAuthPanel";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin - OPTIQUE Control Panel" },
      { name: "description", content: "Manage OPTIQUE products, orders, inventory and content." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin - OPTIQUE Control Panel" },
      { property: "og:description", content: "Internal control panel for the OPTIQUE store." },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { to: "/admin/queries", label: "Queries", icon: MessageSquare, exact: false },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes, exact: false },
  { to: "/admin/content", label: "Content", icon: ImageIcon, exact: false },
  { to: "/admin/blog", label: "Blog", icon: Newspaper, exact: false },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote, exact: false },
  { to: "/admin/faqs", label: "FAQs", icon: HelpCircle, exact: false },
  { to: "/admin/subscribers", label: "Subscribers", icon: Mail, exact: false },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, exact: false },
] as const;

function AdminLayout() {
  const { isAdmin, logout, settings } = useStore();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return <AdminAuthPanel />;

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
          <Outlet />
        </div>
      </div>
    </div>
  );
}
