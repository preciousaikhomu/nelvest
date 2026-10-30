import Link from "next/link";
import { db } from "@/lib/db";
import { AdminShell, PageHead, pageAdmin } from "@/components/shells";
import { Kpi, LineChart, Status, usd } from "@/components/ui";
import { latestPrices, valueAccount, equityCurve } from "@/lib/portfolio";
import { tradingMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const u = await pageAdmin();
  const [cfg, accounts, pending, investors, lastRun] = await Promise.all([
    db.botConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    db.investmentAccount.findMany({ where: { user: { role: "INVESTOR" } } }),
    db.kycSubmission.count({ where: { status: { in: ["PENDING", "MANUAL_REVIEW"] } } }),
    db.user.count({ where: { role: "INVESTOR" } }),
    db.engineRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  const prices = await latestPrices();
  const vals = accounts.map((a) => ({ a, v: valueAccount(a, prices) }));
  const managed = vals.filter((x) => x.a.mode === "MANAGED").reduce((s, x) => s + x.v.equity, 0);
  const byo = vals.filter((x) => x.a.mode === "BYO").reduce((s, x) => s + Number(x.a.budgetUsdt), 0);
  const curve = await equityCurve(accounts.filter((a) => a.mode === "MANAGED").map((a) => a.id), vals.filter((x) => x.a.mode === "MANAGED").reduce((s, x) => s + x.v.deposited, 0));
  const paused = vals.filter((x) => !x.a.active && x.a.pausedReason);

  return (
    <AdminShell user={u} current="/admin">
      <PageHead eyebrow={`Console · ${tradingMode()} mode`} title="Overview" right={<Status s={cfg.state} />} />
      <div className="kpis">
        <Kpi label="Managed assets" value={usd(managed)} note="pooled accounts" />
        <Kpi label="Connected budget" value={usd(byo)} note="own-exchange accounts" />
        <Kpi label="Investors" value={String(investors)} note={`${pending} awaiting KYC review`} />
        <Kpi label="Last engine run" value={lastRun ? lastRun.startedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "Never"} note={lastRun?.error ? "Failed. See audit log." : lastRun ? lastRun.startedAt.toLocaleDateString("en-GB") : "Start the bot in Bot control"} />
      </div>
      <div className="two">
        <div className="panel"><h3 style={{ marginBottom: 12 }}>Managed pool value</h3><LineChart points={curve} label="Managed pool value over time" /></div>
        <div className="panel stack" style={{ fontSize: 13.5 }}>
          <h3>Needs your attention</h3>
          {pending > 0 && <p><Link href="/admin/investors">{pending} identity check(s) to review</Link></p>}
          {paused.map((x) => <p key={x.a.id}>Account {x.a.id.slice(-6)} paused: {x.a.pausedReason}</p>)}
          {lastRun?.error && <p className="callout bad">Last engine run failed: {lastRun.error}</p>}
          {pending === 0 && paused.length === 0 && !lastRun?.error && <p className="muted">Nothing needs action right now.</p>}
        </div>
      </div>
    </AdminShell>
  );
}
