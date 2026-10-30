import { db } from "@/lib/db";
import ApiForm from "@/components/ApiForm";
import { InvestorShell, PageHead, pageInvestor } from "@/components/shells";
import { Status } from "@/components/ui";
import { SUPPORTED } from "@/lib/exchange";
import { tradingMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Connect() {
  const u = await pageInvestor();
  const acct = await db.investmentAccount.findFirst({ where: { userId: u.id, mode: "BYO" }, include: { connection: true } });
  const c = acct?.connection;
  const paper = tradingMode() === "paper";
  return (
    <InvestorShell user={u} current="/app/connect">
      <PageHead eyebrow="Bring your own exchange" title="Connect exchange" right={c ? <Status s={c.status} /> : undefined} />
      {u.kycStatus !== "VERIFIED" && <p className="callout">Finish your identity check before connecting an exchange.</p>}
      {c && c.status === "ACTIVE" && (
        <div className="panel stack">
          <p><b>{c.exchange === "paper" ? "Test account (simulated)" : SUPPORTED[c.exchange as keyof typeof SUPPORTED]?.label ?? c.exchange}</b> connected{c.exchange !== "paper" && <> · key ending <span className="mono">{c.keyHint}</span></>}.</p>
          <p className="muted" style={{ fontSize: 13.5 }}>{c.statusDetail}. Budget {Number(acct!.budgetUsdt).toLocaleString("en-US")} USDT, {acct!.riskLevel.toLowerCase()} risk, stop at −{acct!.stopDrawdownPct}%.</p>
          <ApiForm action="/api/exchange/disconnect" submit="Disconnect and delete key" danger />
        </div>
      )}
      <div className="panel">
        <ApiForm action="/api/exchange/connect" submit={c?.status === "ACTIVE" ? "Replace connection" : "Check key and connect"}>
          <h3>1. Choose your exchange</h3>
          <label>Exchange<select id="exchange" name="exchange" defaultValue={paper ? "paper" : "binance"}>
            {paper && <option value="paper">Test account, no keys needed (simulated money)</option>}
            {Object.entries(SUPPORTED).map(([id, e]) => <option key={id} value={id}>{e.label} · {e.region}</option>)}
          </select></label>
          <h3>2. Paste a trade-only API key</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>On your exchange, create a key with <b>spot trading on</b> and <b>withdrawals off</b>. Leave these empty for a test account.</p>
          <div className="grid2">
            <label>API key<input id="apiKey" name="apiKey" autoComplete="off" spellCheck={false} /></label>
            <label>API secret<input id="apiSecret" name="apiSecret" type="password" autoComplete="off" /></label>
          </div>
          <label className="choice"><input type="checkbox" id="confirmNoWithdraw" name="confirmNoWithdraw" /><span>I confirm withdrawals are turned off for this key. Needed for exchanges that don't report key permissions.</span></label>
          <h3>3. Set the bot's limits on your account</h3>
          <div className="params">
            <label>Budget the bot may use (USDT)<input id="budget" name="budget" inputMode="decimal" defaultValue="500" /></label>
            <label>Risk level<select id="riskLevel" name="riskLevel" defaultValue="Balanced"><option>Conservative</option><option>Balanced</option><option>Aggressive</option></select></label>
            <label>Stop if account falls (%)<select id="stopDrawdownPct" name="stopDrawdownPct" defaultValue="15"><option value="10">10</option><option value="15">15</option><option value="20">20</option></select></label>
          </div>
          <p className="callout">Your key is encrypted before it is stored and is only decrypted inside the trading engine. Nelvest refuses any key that can withdraw.</p>
        </ApiForm>
      </div>
    </InvestorShell>
  );
}
