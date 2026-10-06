import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecordPagination({
  page,
  total,
  busy,
  error,
  onPage,
  onRefresh,
}: {
  page: number;
  total: number;
  busy: boolean;
  error?: Error | null;
  onPage: (page: number) => void;
  onRefresh: () => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone py-3 text-xs">
      <span role={error ? "alert" : undefined}>
        {error ? error.message : `${total} records | Page ${page} of ${pages}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          title="Refresh records"
          aria-label="Refresh records"
          disabled={busy}
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Previous page"
          aria-label="Previous page"
          disabled={busy || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Next page"
          aria-label="Next page"
          disabled={busy || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
