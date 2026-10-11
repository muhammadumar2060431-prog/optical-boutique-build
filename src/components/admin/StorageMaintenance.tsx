import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { requestStorageMaintenance, type StorageCleanupResult } from "@/lib/storage-maintenance";

export function StorageMaintenance() {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<StorageCleanupResult | null>(null);
  const status = useQuery({
    queryKey: ["storage-cleanup-status"],
    queryFn: () => requestStorageMaintenance(supabase, "GET"),
    refetchInterval: 60000,
    retry: false,
  });
  const cleanup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await requestStorageMaintenance(supabase);
      setLastResult(result);
      await status.refetch();
      if (result.retrying) toast.warning(`${result.retrying} file deletions will be retried.`);
      else toast.success(`${result.removed} deleted-item files removed.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Storage cleanup failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="border-y border-zinc-300 py-5"
      aria-labelledby="storage-maintenance-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="storage-maintenance-heading" className="text-lg font-semibold">
          Storage
        </h2>
        <Button
          variant="outline"
          size="icon"
          title="Refresh storage status"
          aria-label="Refresh storage status"
          disabled={busy || status.isFetching}
          onClick={() => void status.refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {status.isPending ? (
        <p role="status" className="mt-3 text-sm">
          Loading storage status...
        </p>
      ) : status.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {status.error.message}
        </p>
      ) : (
        <p className="mt-3 text-sm">Files awaiting cleanup: {status.data.candidates ?? 0}</p>
      )}
      {lastResult && (
        <p role="status" className="mt-2 text-sm">
          Removed: {lastResult.removed} | Retrying: {lastResult.retrying}
        </p>
      )}
      <Button
        className="mt-4"
        variant="outline"
        disabled={busy || status.isPending || status.isError || !status.data?.candidates}
        onClick={() => void cleanup()}
      >
        {busy ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}{" "}
        Clean deleted files
      </Button>
    </section>
  );
}
