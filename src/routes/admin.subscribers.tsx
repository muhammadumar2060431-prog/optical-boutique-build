import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, Download, Mail, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/subscribers")({
  component: AdminSubscribers,
});

function AdminSubscribers() {
  const { subscribers, deleteSubscriber } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubscribers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, searchQuery]);

  const handleCopyAllEmails = () => {
    if (!subscribers.length) {
      toast.error("No subscribers to copy.");
      return;
    }
    const allEmails = subscribers.map((s) => s.email).join(", ");
    navigator.clipboard.writeText(allEmails);
    toast.success(
      `Copied ${subscribers.length} subscriber email${subscribers.length > 1 ? "s" : ""} to clipboard!`,
    );
  };

  const handleExportCSV = () => {
    if (!subscribers.length) {
      toast.error("No subscribers to export.");
      return;
    }
    const header = "Email,Date Subscribed,Status\n";
    const rows = subscribers
      .map(
        (s) =>
          `"${s.email}","${new Date(s.createdAt).toLocaleDateString()}","${s.status || "Active"}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscribers list exported as CSV.");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold font-bold tracking-[0.18em] uppercase text-xs">
            Audience & Subscribers
          </p>
          <h1 className="mt-1 font-display text-3xl text-foreground font-semibold">
            Newsletter Subscribers
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            List of customer emails collected from the website newsletter box. You can copy
            individual emails or export the whole list.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full text-xs" onClick={handleCopyAllEmails}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy All Emails ({subscribers.length})
          </Button>

          <Button variant="outline" className="rounded-full text-xs" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-2xl border border-stone">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            placeholder="Search subscriber emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="text-xs text-ink-muted">
          Total Subscribers:{" "}
          <span className="font-semibold text-foreground">{subscribers.length}</span>
        </div>
      </div>

      {/* Subscribers Table */}
      {subscribers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          <Mail className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="font-semibold text-foreground">No subscribers collected yet</p>
          <p className="text-xs text-ink-muted mt-1">
            When visitors enter their email on your website, they will instantly appear here.
          </p>
        </div>
      ) : filteredSubscribers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone bg-card px-6 py-12 text-center text-xs text-ink-muted">
          No subscribers found matching "{searchQuery}".
        </div>
      ) : (
        <div className="rounded-2xl border border-[#666666] bg-[#f9f9f9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b-2 border-[#555555] bg-[#666666] text-[11px] font-semibold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-white">#</th>
                  <th className="px-5 py-3 text-white">Subscriber Email</th>
                  <th className="px-5 py-3 text-white">Date Subscribed</th>
                  <th className="px-5 py-3 text-white">Status</th>
                  <th className="px-5 py-3 text-right text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300 bg-[#f9f9f9]">
                {filteredSubscribers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-zinc-200/80 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-ink-muted w-12">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 text-[10px] font-bold text-gold">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <span className="font-mono text-xs sm:text-sm select-all">{s.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-muted">
                      {new Date(s.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-semibold"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs gap-1.5"
                          title="Copy Email"
                          onClick={() => {
                            navigator.clipboard.writeText(s.email);
                            toast.success(`Copied: ${s.email}`);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                          title="Delete Subscriber"
                          onClick={() => {
                            if (confirm(`Remove ${s.email} from subscribers?`)) {
                              deleteSubscriber(s.id);
                              toast.success("Subscriber removed.");
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
