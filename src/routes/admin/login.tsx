import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { loginAdmin } from "@/lib/cms/api";
import { AdminButton, AdminField, AdminInput } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginAdmin({ data: { password } });
      void navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-deep">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl text-gold-gradient">CMS Admin</div>
          <p className="mt-2 text-sm text-muted-foreground">Salgados Borges, área restrita</p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          <AdminField label="Senha" hint="Padrão local: admin123 (altere em .env)">
            <AdminInput
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </AdminField>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AdminButton type="submit" className="w-full" disabled={busy}>
            {busy ? "Entrando..." : "Entrar"}
          </AdminButton>
        </form>
      </div>
    </div>
  );
}
