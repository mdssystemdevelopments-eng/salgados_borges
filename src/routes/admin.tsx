import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { getAuthStatus } from "@/lib/cms/api";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const isLogin = location.pathname === "/admin/login";
    const { authenticated } = await getAuthStatus();
    if (!authenticated && !isLogin) {
      throw redirect({ to: "/admin/login" });
    }
    if (authenticated && isLogin) {
      throw redirect({ to: "/admin" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/admin/login";

  return (
    <>
      <Outlet />
      {!isLogin ? <Toaster richColors position="top-right" theme="dark" /> : null}
    </>
  );
}
