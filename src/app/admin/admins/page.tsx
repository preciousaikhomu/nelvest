import { db } from "@/lib/db";
import InviteForm from "@/components/InviteForm";
import { AdminShell, PageHead, pageAdmin } from "@/components/shells";

export const dynamic = "force-dynamic";

export default async function Admins() {
  const u = await pageAdmin();
  const [admins, invites] = await Promise.all([
    db.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } }),
    db.adminInvite.findMany({ where: { acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <AdminShell user={u} current="/admin/admins">
      <PageHead eyebrow="Console" title="Admins" />
      <div className="panel table-wrap">
        <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Since</th></tr></thead>
          <tbody>
            {admins.map((a) => <tr key={a.id}><td><b>{a.firstName} {a.lastName}</b></td><td>{a.email}</td><td><span className={`chip ${a.adminRole === "OWNER" ? "gold" : ""}`}>{a.adminRole?.replace("_", " ").toLowerCase()}</span></td><td className="mono">{a.createdAt.toLocaleDateString("en-GB")}</td></tr>)}
            {invites.map((i) => <tr key={i.id}><td className="muted">Invited</td><td>{i.email}</td><td><span className="chip warn">{i.role.replace("_", " ").toLowerCase()}</span></td><td className="mono">expires {i.expiresAt.toLocaleDateString("en-GB")}</td></tr>)}
          </tbody></table>
      </div>
      {u.adminRole === "OWNER" ? (
        <div className="panel stack">
          <h3>Invite another admin</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>Viewers see dashboards. KYC reviewers also approve identity checks. Operators can also pause, run and stop the bot. Only you, the owner, can change bot settings or invite admins.</p>
          <InviteForm />
        </div>
      ) : <p className="muted">Only the owner can invite admins.</p>}
    </AdminShell>
  );
}
