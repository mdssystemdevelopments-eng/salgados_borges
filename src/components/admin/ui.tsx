import { useRef, useState } from "react";
import { uploadCmsImage } from "@/lib/cms/api";
import { cn } from "@/lib/utils";

export function AdminField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-muted-foreground/80">{hint}</span> : null}
    </label>
  );
}

export const adminInputClass =
  "w-full rounded-md border border-gold/40 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-1 focus:ring-gold/40";

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(adminInputClass, props.className)} />;
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(adminInputClass, "min-h-24 resize-y", props.className)} />;
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(adminInputClass, props.className)} />;
}

export function AdminButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
}) {
  const styles = {
    primary: "bg-gold-gradient text-primary-foreground hover:opacity-90",
    ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-2",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    outline: "border border-border text-foreground hover:border-gold hover:text-gold",
  }[variant];

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50",
        styles,
        className,
      )}
    />
  );
}

export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      const base64 = btoa(binary);
      const result = await uploadCmsImage({
        data: { filename: file.name, base64, mimeType: file.type || "image/jpeg" },
      });
      onChange(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminField label={label}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <AdminInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/..." />
          <div className="flex flex-wrap gap-2">
            <AdminButton type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? "Enviando..." : "Enviar arquivo"}
            </AdminButton>
            {value ? (
              <AdminButton type="button" variant="ghost" onClick={() => onChange("")}>
                Remover
              </AdminButton>
            ) : null}
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
      </div>
    </AdminField>
  );
}

export function VisibilityBadge({ visible }: { visible: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        visible ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/20 text-zinc-400",
      )}
    >
      {visible ? "Visível" : "Oculto"}
    </span>
  );
}
