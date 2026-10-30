import { db } from "@/lib/db";
import { InvestorShell, PageHead, pageInvestor } from "@/components/shells";
import { usd } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Trades() {
  const u = await pageInvestor();
  const trades = await db.trade.findMany({ where: { account: { userId: u.id } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <InvestorShell user={u} current="/app/trades">
      <PageHead eyebrow="All accounts" title="Trade history" />
      <div className="panel table-wrap">
        {trades.length === 0 ? <p className="empty">No trades yet. The bot trades when a signal clears its confidence bar.</p> : (
          <table><thead><tr><th>Time</th><th>Pair</th><th>Side</th><th className="r">Size</th><th className="r">Price</th><th className="r">P/L</th><th>Mode</th><th>Reason</th></tr></thead>
            <tbody>{trades.map((t) => {
              const pnl = t.realizedPnlUsdt === null ? null : Number(t.realizedPnlUsdt);
              return <tr key={t.id}>
                <td className="mono">{t.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="mono">{t.pair}</td><td><span className={`chip ${t.side === "BUY" ? "good" : "warn"}`}>{t.side.toLowerCase()}</span></td>
                <td className="r mono">{Number(t.qty).toPrecision(6)}</td><td className="r mono">{Number(t.price).toLocaleString("en-US")}</td>
                <td className={`r mono ${pnl === null ? "" : pnl >= 0 ? "up" : "down"}`}>{pnl === null ? "—" : usd(pnl)}</td>
                <td><span className="chip">{t.mode.toLowerCase()}</span></td><td className="muted">{t.reason}</td>
              </tr>;
            })}</tbody></table>
        )}
      </div>
    </InvestorShell>
  );
}
