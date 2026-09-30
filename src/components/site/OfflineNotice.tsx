import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateConnectionState = () => setIsOffline(!navigator.onLine);
    updateConnectionState();
    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);
    return () => {
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-9 items-center justify-center gap-2 bg-jet px-4 py-2 text-center text-xs font-medium text-cream"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        You are offline. Saved products remain available; images will retry automatically.
      </span>
    </div>
  );
}
