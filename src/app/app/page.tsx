import Link from "next/link";
import { db } from "@/lib/db";
import { InvestorShell, PageHead, pageInvestor } from "@/components/shells";
import { Kpi, LineChart, Status, usd } from "@/components/ui";
import { latestPrices, valueAccount, equityCurve } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const u = await pageInvestor();
  if (u.kycStatus !== "VERIFIED") {
    return (
      <InvestorShell user={u} current="/app">
        <PageHead eyebrow="Getting started" title={u.kycStatus === "NOT_STARTED" || u.kycStatus === "REJECTED" ? "Verify your identity first" : "Your identity check is being reviewed"} />
        <div className="panel stack">
          <p>Nigerian rules require an identity check before you can invest. It takes about two minutes with your NIN or BVN.</p>
          <div><Link className="btn btn-primary" href="/app/kyc">Go to identity check</Link></div>
        </div>
      </InvestorShell>
    );
  }
  const accounts = await db.investmentAccount.findMany({ where: { userId: u.id }, include: { connection: true }, orderBy: { createdAt: "asc" } });
  const prices = await latestPrices();
  const views = await Promise.all(accounts.map(async (a) => {
    const v = valueAccount(a, prices);
    return { a, v, curve: await equityCurve([a.id], v.deposited) };
  }));

  return (
    <InvestorShell user={u} current="/app">
      {views.map(({ a, v, curve }) => (
        <section key={a.id} className="stack">
          <PageHead eyebrow={a.mode === "MANAGED" ? "Managed account" : `Own exchange${a.connection ? ` · ${a.connection.exchange}` : ""}`} title="Portfolio" right={<Status s={a.active ? "ACTIVE" : "PAUSED"} />} />
          {a.pausedReason && <p className="callout">{a.pausedReason}</p>}
          {a.mode === "BYO" && !a.connection && <p className="callout">Connect an exchange so the bot can trade. <Link href="/app/connect">Connect now</Link></p>}
          {a.mode === "MANAGED" && v.deposited === 0 && <p className="callout">This account has no funds yet. <Link href="/app/funds">See deposit options</Link></p>}
          <div className="kpis">
            <Kpi label="Balance" value={usd(v.equity)} note={`${usd(v.cash)} in cash`} />
            <Kpi label="Funded" value={usd(v.deposited)} />
            <Kpi label="Net P/L" value={usd(v.pnl)} tone={v.pnl >= 0 ? "up" : "down"} note="after fees" />
            <Kpi label="Drawdown" value={`−${v.drawdownPct.toFixed(1)}%`} note={`limit −${a.stopDrawdownPct}%`} />
          </div>
          <div className="two">
            <div className="panel"><div className="page-head" style={{ marginBottom: 12 }}><h3>Account value</h3><span className="muted mono" style={{ fontSize: 12 }}>USDT</span></div><LineChart points={curve} label="Account value over time" /></div>
            <div className="panel"><h3 style={{ marginBottom: 16 }}>Holdings</h3>
              {v.rows.length === 0 ? <p className="empty">All in cash. The bot buys when a signal clears its confidence bar.</p> : (
                <div className="alloc">{v.rows.map((r) => (
                  <div className="alloc-row" key={r.asset}><span className="mono">{r.asset}</span><div className="bar"><i style={{ width: `${(r.value / v.equity) * 100}%` }} /></div><span className="mono" style={{ textAlign: "right" }}>{((r.value / v.equity) * 100).toFixed(0)}%</span></div>
                ))}</div>
              )}
            </div>
          </div>
        </section>
      ))}
    </InvestorShell>
  );
}
