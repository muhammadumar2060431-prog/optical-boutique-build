import { createFileRoute } from "@tanstack/react-router";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { RequireAdmin } from "@/components/admin/RequireAdmin";

function ProtectedDashboard() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}

export const Route = createFileRoute("/admin/")({
  component: ProtectedDashboard,
});
