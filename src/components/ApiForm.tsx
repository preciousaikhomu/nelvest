"use client";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";

/** Posts the form's fields as JSON to an API route, shows the result, then follows any redirect. */
export default function ApiForm({ action, children, submit, className, danger, onDone }: {
  action: string; children?: ReactNode; submit: string; className?: string; danger?: boolean;
  onDone?: (data: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body: Record<string, unknown> = {};
    new FormData(e.currentTarget).forEach((v, k) => { body[k] = v; });
    try {
      const res = await fetch(action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error || "Something went wrong. Try again." }); return; }
      if (data.message) setMsg({ ok: true, text: data.message });
      onDone?.(data);
      if (data.redirect) router.push(data.redirect); else router.refresh();
    } catch {
      setMsg({ ok: false, text: "Could not reach the server. Check your connection and try again." });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className={className ?? "stack"} noValidate>
      {children}
      {msg && <p className={`form-msg ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</p>}
      <div><button type="submit" className={danger ? "btn-danger" : "btn-primary"} disabled={busy}>{busy ? "Working…" : submit}</button></div>
    </form>
  );
}
