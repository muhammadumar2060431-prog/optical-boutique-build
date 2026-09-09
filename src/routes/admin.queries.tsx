import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { useStore } from "@/lib/store";
import type { ContactQuery } from "@/lib/types";

export const Route = createFileRoute("/admin/queries")({
  component: AdminQueries,
});

const statuses: Array<ContactQuery["status"]> = ["New", "Responded", "Archived"];

const statusConfig: Record<
  ContactQuery["status"],
  { label: string; badgeClass: string; activeClass: string }
> = {
  New: {
    label: "New",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    activeClass: "bg-blue-600 text-white border-blue-600 shadow-sm",
  },
  Responded: {
    label: "Responded",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
  },
  Archived: {
    label: "Archived",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
    activeClass: "bg-zinc-700 text-white border-zinc-700 shadow-sm",
  },
};

function QueryDetailsModal({
  query,
  storeName,
  onStatusChange,
  onDelete,
}: {
  query: ContactQuery;
  storeName: string;
  onStatusChange: (status: ContactQuery["status"]) => void;
  onDelete: () => void;
}) {
  const isEmail = query.contact.includes("@");
  const cleanDigits = query.contact.replace(/[^0-9]/g, "");
  let waNumber = cleanDigits;
  if (cleanDigits.startsWith("0")) {
    waNumber = "92" + cleanDigits.slice(1);
  }

  const waMessage = encodeURIComponent(
    `Hello ${query.name}, thank you for contacting ${storeName} regarding "${query.productName}". How can we assist you today?`,
  );
  const waUrl = waNumber.length >= 7 ? `https://wa.me/${waNumber}?text=${waMessage}` : null;
  const mailUrl = isEmail ? `mailto:${query.contact}?subject=RE: ${query.productName} Enquiry` : null;

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#505050] via-[#666666] to-[#505050] border-b border-[#444444] px-6 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-black/25 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-white backdrop-blur-sm border border-white/10">
              <MessageSquare className="h-3.5 w-3.5 text-gold" />
              QUERY DETAILS
            </span>
          </div>
          <Badge
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              statusConfig[query.status].badgeClass
            }`}
          >
            {query.status}
          </Badge>
        </div>
        <h2 className="mt-3 font-display text-2xl text-white">{query.name}</h2>
        <p className="text-xs text-zinc-200 mt-1 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-gold" />
          Submitted on {new Date(query.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Body Content */}
      <div className="overflow-y-auto p-6 space-y-6">
        {/* Customer Information */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <User className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Customer Name
              </span>
            </div>
            <p className="font-semibold text-zinc-900 text-base">{query.name}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              {isEmail ? (
                <Mail className="h-4 w-4 text-zinc-400" />
              ) : (
                <Phone className="h-4 w-4 text-zinc-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Contact Info
              </span>
            </div>
            <p className="font-semibold text-zinc-900 text-base select-all">{query.contact}</p>
          </div>
        </div>

        {/* Product Reference */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-700 mb-1">
            <FileText className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Product Interested
            </span>
          </div>
          <p className="font-medium text-zinc-900 text-base">{query.productName}</p>
        </div>

        {/* Enquiry Message */}
        <div className="rounded-xl border border-gold/30 bg-amber-50/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-900 mb-2">
            <MessageSquare className="h-4 w-4 text-gold shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Message / Inquiry
            </h3>
          </div>
          <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
            {query.message}
          </p>
        </div>

        {/* Reply Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
            >
              <WhatsAppIcon className="h-4 w-4 fill-current" />
              Reply on WhatsApp
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          )}
          {mailUrl && (
            <a
              href={mailUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" />
              Reply via Email
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          )}
        </div>
      </div>

      {/* Footer Status & Delete Actions */}
      <div className="border-t border-zinc-200 bg-zinc-50/90 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Set Status:
          </span>
          <div className="flex gap-1.5">
            {statuses.map((s) => {
              const isCurrent = query.status === s;
              const cfg = statusConfig[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatusChange(s)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${
                    isCurrent
                      ? cfg.activeClass
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {isCurrent && <Check className="h-3.5 w-3.5" />}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-xl text-xs font-bold"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Query
        </Button>
      </div>
    </div>
  );
}

function AdminQueries() {
  const { queries, setQueryStatus, deleteQuery, settings } = useStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<ContactQuery | null>(null);

  const filtered = useMemo(
    () =>
      queries.filter((q) => {
        if (statusFilter !== "all" && q.status !== statusFilter) return false;
        if (searchQuery) {
          const needle = searchQuery.toLowerCase();
          if (
            !q.name.toLowerCase().includes(needle) &&
            !q.contact.toLowerCase().includes(needle) &&
            !q.productName.toLowerCase().includes(needle) &&
            !q.message.toLowerCase().includes(needle)
          ) {
            return false;
          }
        }
        return true;
      }),
    [queries, statusFilter, searchQuery],
  );

  const changeStatus = (query: ContactQuery, nextStatus: ContactQuery["status"]) => {
    setQueryStatus(query.id, nextStatus);
    setSelected((prev) => (prev && prev.id === query.id ? { ...prev, status: nextStatus } : prev));
    toast.success(`Query marked as ${nextStatus}`);
  };

  const handleDelete = (query: ContactQuery) => {
    if (!window.confirm(`Aap query from "${query.name}" ko permanently delete karna chahte hain?`)) {
      return;
    }
    deleteQuery(query.id);
    setSelected(null);
    toast.success("Query permanently deleted");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Enquiries & Form Messages</p>
          <h1 className="mt-2 font-display text-3xl">Website Queries</h1>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-stone/30 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600">
          <MessageSquare className="h-4 w-4 text-gold shrink-0" />
          <span>Total Queries: <strong>{queries.length}</strong></span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          placeholder="Search by customer name, email, phone or product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-h-11 bg-white border-zinc-300"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            aria-label="Filter by status"
            className="min-h-11 bg-white border-zinc-300"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#666666] bg-[#f9f9f9] px-6 py-16 text-center text-sm text-ink-muted">
          No queries found — form submissions sent by users through the Contact form will show up here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#666666] bg-[#f9f9f9] shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b-2 border-[#555555] bg-[#666666] text-left text-xs tracking-[0.14em] uppercase text-white">
              <tr>
                <th className="px-4 py-3 text-white font-semibold">Date</th>
                <th className="px-4 py-3 text-white font-semibold">Customer</th>
                <th className="px-4 py-3 text-white font-semibold">Product / Topic</th>
                <th className="px-4 py-3 text-white font-semibold">Message</th>
                <th className="px-4 py-3 text-white font-semibold">Status</th>
                <th className="px-4 py-3 text-white font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300 bg-[#f9f9f9]">
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => setSelected(q)}
                  className="cursor-pointer transition-colors hover:bg-zinc-200/80"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted text-xs">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-900">{q.name}</p>
                    <p className="text-xs text-ink-muted">{q.contact}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {q.productName || "General enquiry"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 max-w-xs truncate">
                    {q.message}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        statusConfig[q.status].badgeClass
                      }`}
                    >
                      {q.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(q)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                      title="Delete query"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-2xl border-zinc-200 bg-white shadow-2xl">
          {selected && (
            <QueryDetailsModal
              query={selected}
              storeName={settings.storeName}
              onStatusChange={(status) => changeStatus(selected, status)}
              onDelete={() => handleDelete(selected)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
