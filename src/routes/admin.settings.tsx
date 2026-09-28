import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState(settings);
  const [newPassword, setNewPassword] = useState("");

  // Keep form in sync when settings are loaded or updated from store / Supabase
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={`s-${key}`}>{label}</Label>
      <Input
        id={`s-${key}`}
        type={type}
        value={String(form[key] ?? "")}
        onChange={(e) =>
          setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })
        }
        className="min-h-11 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-gold"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-gold">Configuration</p>
        <h1 className="mt-2 font-display text-3xl">Settings</h1>
      </header>

      <div className="space-y-6 rounded-xl border border-stone bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("storeName", "Store name")}
          {field("whatsapp", "WhatsApp number")}
          {field("phone", "Contact phone")}
          {field("email", "Contact email")}
          {field("address", "Address")}
          {field("hours", "Business hours")}
          {field("lowStockThreshold", "Low-stock threshold", "number")}
        </div>

        <ImageUpload
          label="Logo"
          optional
          value={form.logo}
          onChange={(logo) => setForm({ ...form, logo })}
          hint="400×120 px • Max 80 KB • PNG transparent background recommended"
          aspectHint="Wide logo"
          storageFolder="settings"
        />

        <Button
          className="min-h-11 rounded-full"
          onClick={() => {
            if (!window.confirm("Are you sure you want to save these settings?")) {
              return;
            }
            updateSettings(form);
            toast.success("Settings saved — the storefront is already showing them.");
          }}
        >
          Save settings
        </Button>
      </div>

      <div className="space-y-4 rounded-xl border border-stone bg-card p-6">
        <h2 className="font-display text-xl">Admin access</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-adminEmail">Admin email</Label>
            <Input
              id="s-adminEmail"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              className="min-h-11 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-password">New password</Label>
            <Input
              id="s-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="min-h-11 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={async () => {
            if (newPassword && newPassword.length < 6) {
              toast.error("The password must be at least 6 characters long.");
              return;
            }
            if (!window.confirm("Are you sure you want to update the admin credentials?")) {
              return;
            }
            try {
              if (newPassword) {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) {
                  toast.error("Password update failed: " + error.message);
                  return;
                }
              }
              if (form.adminEmail && form.adminEmail !== settings.adminEmail) {
                const { error: emailErr } = await supabase.auth.updateUser({
                  email: form.adminEmail,
                });
                if (emailErr) {
                  toast.error("Email update failed: " + emailErr.message);
                  return;
                }
                updateSettings({
                  adminEmail: form.adminEmail,
                });
              }
              setNewPassword("");
              toast.success("The admin credentials were securely updated in Supabase Auth.");
            } catch (error: unknown) {
              toast.error(
                "Error: " +
                  (error instanceof Error ? error.message : "Unable to update credentials."),
              );
            }
          }}
        >
          Update credentials
        </Button>
      </div>
    </div>
  );
}
