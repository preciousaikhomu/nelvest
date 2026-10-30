import { db } from "@/lib/db";
import { AdminShell, PageHead, pageAdmin } from "@/components/shells";

export const dynamic = "force-dynamic";

export default async function Audit() {
  const u = await pageAdmin();
  const rows = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { actor: true } });
  return (
    <AdminShell user={u} current="/admin/audit">
      <PageHead eyebrow="Console" title="Audit log" />
      <div className="panel table-wrap">
        {rows.length === 0 ? <p className="empty">Every sign-in, KYC decision and bot change is recorded here.</p> : (
          <table><thead><tr><th>Time</th><th>Who</th><th>Action</th><th>Detail</th><th>IP</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}>
              <td className="mono">{r.createdAt.toLocaleString("en-GB")}</td><td>{r.actor ? r.actor.email : "system"}</td>
              <td className="mono">{r.action}</td><td className="muted" style={{ whiteSpace: "normal", maxWidth: 360 }}>{r.detail ? JSON.stringify(r.detail) : ""}</td><td className="mono muted">{r.ip ?? ""}</td>
            </tr>)}</tbody></table>
        )}
      </div>
    </AdminShell>
  );
}
