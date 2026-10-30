import Link from "next/link";
import { TopBar } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function recentSignals() {
  try {
    const rows = await db.signal.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
    const seen = new Set<string>();
    return rows.filter((r) => (seen.has(r.pair) ? false : (seen.add(r.pair), true)));
  } catch { return []; }
}

export default async function Home() {
  const signals = await recentSignals();
  return (
    <>
      <TopBar />
      <main>
        <div className="wrap hero">
          <div>
            <p className="eyebrow">AI-assisted crypto trading · Built in Nigeria</p>
            <h1 style={{ marginTop: 16 }}>Your crypto, worked by a disciplined <em>machine</em> and a human who answers for it.</h1>
            <p className="lead">Nelvest runs a rules-based AI trading bot across major pairs. Hand your funds to a managed account, or keep them on your own exchange and let the bot trade there. Every trade is logged, every limit is published.</p>
            <div className="cta-row"><Link className="btn btn-primary" href="/signup">Open an account</Link><a className="btn" href="#how">See how it works</a></div>
          </div>
          <div className="terminal" aria-label="Latest bot signals">
            <div className="terminal-head"><span className="eyebrow">Latest bot signals</span><span className="chip">Live from the engine</span></div>
            {signals.length === 0 ? <p className="empty">Signals appear here after the bot's first run.</p> : signals.map((s) => (
              <div className="signal" key={s.id}>
                <span className="pair">{s.pair}</span>
                <div className="bar"><i style={{ width: `${Number(s.confidence) * 100}%` }} /></div>
                <span className={`chip ${s.action === "BUY" ? "good" : s.action === "SELL" ? "warn" : ""}`}>{s.action} · {Number(s.confidence).toFixed(2)}</span>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12 }}>Confidence is the model's score for a setup, not a promise of profit. Trades only execute inside the risk limits below.</p>
          </div>
        </div>

        <section className="band" id="how"><div className="wrap">
          <div className="band-head"><p className="eyebrow">Two ways to invest</p><h2>Pick who holds the money</h2><p className="muted">Same bot, same risk rules. The difference is custody.</p></div>
          <div className="modes">
            <div className="panel mode">
              <span className="chip gold">Managed account</span><h3>We trade a pooled account for you</h3>
              <ol><li>Verify your identity with your NIN or BVN.</li><li>Deposit USDT or naira into your sub-account.</li><li>The bot trades; the desk reviews every risk breach.</li><li>Withdraw to your bank or wallet, processed within 48 hours.</li></ol>
              <p className="muted" style={{ fontSize: 13.5 }}>Fee: 2% yearly management + 20% of profits above your high-water mark.</p>
            </div>
            <div className="panel mode">
              <span className="chip good">Bring your own exchange</span><h3>The bot trades in your account. We never hold your funds.</h3>
              <ol><li>Create a trade-only API key on your exchange. Withdrawals stay off.</li><li>Paste it into Nelvest. We check the permissions before saving.</li><li>Set your own budget and risk level.</li><li>Revoke the key on your exchange any time to stop the bot.</li></ol>
              <p className="muted" style={{ fontSize: 13.5 }}>Fee: flat monthly subscription. No share of profits.</p>
            </div>
          </div>
        </div></section>

        <section className="band"><div className="wrap">
          <div className="band-head"><p className="eyebrow">Published risk limits</p><h2>The rules the bot cannot break</h2></div>
          <div className="facts">
            <div><span className="eyebrow">Max position</span><b className="num">5%</b><span className="muted" style={{ fontSize: 13.5 }}>of an account per asset, by default</span></div>
            <div><span className="eyebrow">Drawdown stop</span><b className="num">−15%</b><span className="muted" style={{ fontSize: 13.5 }}>from peak pauses the account</span></div>
            <div><span className="eyebrow">Leverage</span><b className="num">1×</b><span className="muted" style={{ fontSize: 13.5 }}>spot only, no borrowed funds</span></div>
            <div><span className="eyebrow">Pairs</span><b className="num">5</b><span className="muted" style={{ fontSize: 13.5 }}>BTC, ETH, SOL, BNB, XRP against USDT</span></div>
          </div>
          <p className="muted" style={{ marginTop: 24, fontSize: 13.5 }}>Track record: published monthly from launch, audited quarterly. No backtests are shown as live results.</p>
        </div></section>

        <section className="band"><div className="wrap risk">
          <div><p className="eyebrow">Read before investing</p><h2 style={{ marginTop: 12, fontSize: 24 }}>Risk disclosure</h2></div>
          <ul>
            <li>Crypto prices are volatile. You can lose part or all of what you invest.</li>
            <li>No return is guaranteed. Past performance does not predict future results.</li>
            <li>An AI model can be wrong. Limits reduce losses but cannot remove them.</li>
            <li>Managed accounts depend on Nelvest's custody. Bring-your-own-exchange accounts depend on your exchange.</li>
            <li>Only invest money you can afford to lose. Talk to a licensed adviser if unsure.</li>
          </ul>
        </div></section>
      </main>
      <footer><div className="wrap"><span>© 2026 Nelvest. Registration with the Securities and Exchange Commission, Nigeria, in progress.</span><span>Benin City, Nigeria</span></div></footer>
    </>
  );
}
