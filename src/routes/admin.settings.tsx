import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState(settings);
  const [newPassword, setNewPassword] = useState("");

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
        className="min-h-11"
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
        />

        <div className="space-y-2">
          <Label htmlFor="s-aboutHeadline">About headline</Label>
          <Input
            id="s-aboutHeadline"
            value={form.aboutHeadline}
            onChange={(e) => setForm({ ...form, aboutHeadline: e.target.value })}
            className="min-h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-aboutBody">About copy</Label>
          <Textarea
            id="s-aboutBody"
            rows={8}
            value={form.aboutBody}
            onChange={(e) => setForm({ ...form, aboutBody: e.target.value })}
          />
        </div>

        <Button
          className="min-h-11 rounded-full"
          onClick={() => {
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
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-password">New password</Label>
            <Input
              id="s-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="min-h-11"
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => {
            if (newPassword && newPassword.length < 6) {
              toast.error("Use at least 6 characters.");
              return;
            }
            updateSettings({
              adminEmail: form.adminEmail,
              ...(newPassword ? { adminPassword: newPassword } : {}),
            });
            setNewPassword("");
            toast.success("Admin credentials updated.");
          }}
        >
          Update credentials
        </Button>
      </div>
    </div>
  );
}
