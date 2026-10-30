import { db } from "@/lib/db";
import ApiForm from "@/components/ApiForm";
import { AdminShell, PageHead, pageAdmin } from "@/components/shells";
import { Status, usd } from "@/components/ui";
import { latestPrices, valueAccount } from "@/lib/portfolio";
import { tradingMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Investors() {
  const u = await pageAdmin();
  const [queue, users, prices] = await Promise.all([
    db.kycSubmission.findMany({ where: { status: { in: ["PENDING", "MANUAL_REVIEW"] } }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { role: "INVESTOR" }, include: { accounts: { include: { connection: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    latestPrices(),
  ]);
  const canReview = u.adminRole !== "VIEWER";
  const paper = tradingMode() === "paper" && u.adminRole === "OWNER";
  return (
    <AdminShell user={u} current="/admin/investors">
      <PageHead eyebrow="Console" title="Investors & KYC" />
      <div className="panel stack">
        <h3>Identity checks to review</h3>
        {queue.length === 0 ? <p className="empty">The review queue is empty.</p> : queue.map((k) => {
          const res = (k.providerResult ?? {}) as { status?: string; reason?: string };
          return (
            <div key={k.id} className="panel stack" style={{ background: "var(--sunk)" }}>
              <div className="page-head"><b>{k.user.firstName} {k.user.lastName}</b><Status s={k.status} /></div>
              <p style={{ fontSize: 13.5 }} className="muted">{k.idType} ending {k.idNumberLast4} · born {k.dateOfBirth} · {k.address}<br />Provider ({k.provider}) said: {res.status ?? "—"}{res.reason ? `, ${res.reason}` : ""}</p>
              {canReview && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ApiForm action={`/api/admin/kyc/${k.id}`} submit="Approve" className="inline-form"><input type="hidden" name="decision" value="VERIFIED" /></ApiForm>
                <ApiForm action={`/api/admin/kyc/${k.id}`} submit="Reject" className="inline-form" danger><input type="hidden" name="decision" value="REJECTED" /><input name="note" placeholder="Reason" aria-label="Rejection reason" style={{ width: 180 }} /></ApiForm>
              </div>}
            </div>
          );
        })}
      </div>
      <div className="panel table-wrap">
        <table><thead><tr><th>Investor</th><th>Mode</th><th>KYC</th><th>Status</th><th className="r">Balance</th><th className="r">P/L</th>{paper && <th className="r">Test funds</th>}</tr></thead>
          <tbody>{users.flatMap((usr) => usr.accounts.map((a) => {
            const v = valueAccount(a, prices);
            return <tr key={a.id}>
              <td><b>{usr.firstName} {usr.lastName}</b><br /><span className="muted" style={{ fontSize: 12 }}>{usr.email}</span></td>
              <td>{a.mode === "MANAGED" ? "Managed" : `Own · ${a.connection?.exchange ?? "not connected"}`}</td>
              <td><Status s={usr.kycStatus} /></td><td><Status s={a.active ? "ACTIVE" : "PAUSED"} /></td>
              <td className="r mono">{usd(v.equity)}</td><td className={`r mono ${v.pnl >= 0 ? "up" : "down"}`}>{v.deposited ? usd(v.pnl) : "—"}</td>
              {paper && <td className="r">{a.mode === "MANAGED" && <ApiForm action={`/api/admin/accounts/${a.id}/fund`} submit="Add" className="inline-form"><input name="amount" defaultValue="1000" aria-label="Amount" /></ApiForm>}</td>}
            </tr>;
          }))}</tbody></table>
        {users.length === 0 && <p className="empty">No investors yet. Share the sign-up link to get your first testers.</p>}
      </div>
    </AdminShell>
  );
}
