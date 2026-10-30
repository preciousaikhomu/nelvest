"use client";
import { useRouter } from "next/navigation";
export default function LogoutButton() {
  const r = useRouter();
  return <button type="button" className="btn-ghost" style={{ padding: "6px 0", border: 0, color: "var(--muted)", fontWeight: 500 }}
    onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); r.push("/"); r.refresh(); }}>Sign out</button>;
}
