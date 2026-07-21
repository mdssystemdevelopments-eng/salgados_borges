import { createFileRoute } from "@tanstack/react-router";

import { CmsPanel } from "@/components/admin/CmsPanel";
import { getAdminCms } from "@/lib/cms/api";

export const Route = createFileRoute("/admin/")({
  loader: () => getAdminCms(),
  component: AdminHomePage,
});

function AdminHomePage() {
  const cms = Route.useLoaderData();
  return <CmsPanel initial={cms} />;
}
