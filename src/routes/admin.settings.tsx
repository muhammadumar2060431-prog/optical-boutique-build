import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
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

const inputClass =
  "min-h-11 border-zinc-300 bg-white focus-visible:ring-2 focus-visible:ring-gold dark:border-zinc-700 dark:bg-zinc-900";

function AdminSettings() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState(settings);
  const [newPassword, setNewPassword] = useState("");
  const [school, setSchool] = useState("");
  const [friend, setFriend] = useState("");
  const [city, setCity] = useState("");
  const [updatingCredentials, setUpdatingCredentials] = useState(false);

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
        onChange={(event) =>
          setForm({
            ...form,
            [key]: type === "number" ? Number(event.target.value) : event.target.value,
          })
        }
        className={inputClass}
      />
    </div>
  );

  const updateCredentials = async () => {
    const emailChanged = form.adminEmail.trim() !== settings.adminEmail.trim();
    if (!emailChanged && !newPassword) {
      toast.error("Enter a new email or password first.");
      return;
    }
    if (newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/.test(newPassword)) {
      toast.error("Password needs 10 characters, uppercase, lowercase, and a number.");
      return;
    }
    if (!school.trim() || !friend.trim() || !city.trim()) {
      toast.error("Answer all three security questions.");
      return;
    }
    if (!window.confirm("Verify your answers and update the admin credentials?")) return;

    setUpdatingCredentials(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");

      const response = await fetch("/api/v1/admin/credentials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(emailChanged ? { email: form.adminEmail.trim() } : {}),
          ...(newPassword ? { newPassword } : {}),
          answers: { school, friend, city },
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to update credentials.");
      }

      if (emailChanged) updateSettings({ adminEmail: form.adminEmail.trim() });
      setNewPassword("");
      setSchool("");
      setFriend("");
      setCity("");
      toast.success("Admin credentials updated after security verification.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update credentials.");
    } finally {
      setUpdatingCredentials(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-gold">Configuration</p>
        <h1 className="mt-2 font-display text-3xl">Settings</h1>
      </header>

      <div className="space-y-6 rounded-lg border border-stone bg-card p-6">
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
          hint="400 x 120 px - Max 80 KB - PNG transparent background recommended"
          aspectHint="Wide logo"
          storageFolder="settings"
        />

        <Button
          className="min-h-11 rounded-full"
          onClick={() => {
            if (!window.confirm("Are you sure you want to save these settings?")) return;
            updateSettings(form);
            toast.success("Settings saved. The storefront is already showing them.");
          }}
        >
          Save settings
        </Button>
      </div>

      <div className="space-y-5 rounded-lg border border-stone bg-card p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-gold" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl">Admin access</h2>
            <p className="text-xs text-ink-muted">
              Security answers are required before email or password changes.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-adminEmail">Admin email</Label>
            <Input
              id="s-adminEmail"
              type="email"
              value={form.adminEmail}
              onChange={(event) => setForm({ ...form, adminEmail: event.target.value })}
              className={inputClass}
              disabled={updatingCredentials}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-password">New password</Label>
            <Input
              id="s-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              disabled={updatingCredentials}
            />
          </div>
        </div>

        <fieldset className="grid gap-4 border-t border-stone pt-5 sm:grid-cols-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Verify your identity
          </legend>
          <div className="space-y-2">
            <Label htmlFor="s-school">First school name</Label>
            <Input
              id="s-school"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className={inputClass}
              disabled={updatingCredentials}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-friend">Childhood best friend's first name</Label>
            <Input
              id="s-friend"
              value={friend}
              onChange={(e) => setFriend(e.target.value)}
              className={inputClass}
              disabled={updatingCredentials}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-city">Birth city</Label>
            <Input
              id="s-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
              disabled={updatingCredentials}
            />
          </div>
        </fieldset>

        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={updateCredentials}
          disabled={updatingCredentials}
        >
          {updatingCredentials && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update credentials
        </Button>
      </div>
    </div>
  );
}
