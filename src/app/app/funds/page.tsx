import { db } from "@/lib/db";
import ApiForm from "@/components/ApiForm";
import { InvestorShell, PageHead, pageInvestor } from "@/components/shells";
import { Status } from "@/components/ui";
import { depositsEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Funds() {
  const u = await pageInvestor();
  const acct = await db.investmentAccount.findFirst({ where: { userId: u.id, mode: "MANAGED" }, include: { ledger: { orderBy: { createdAt: "desc" }, take: 20 } } });
  const open = depositsEnabled();
  return (
    <InvestorShell user={u} current="/app/funds">
      <PageHead eyebrow="Managed account" title="Deposit & withdraw" />
      {!open && <p className="callout bad">Deposits and withdrawals open after SEC registration is complete. Nothing on this page moves real money yet.</p>}
      {!acct ? <div className="panel"><p>You chose to trade on your own exchange, so there is nothing to deposit here.</p></div> : (
        <>
          <div className="two">
            <div className="panel stack">
              <h3>Deposit</h3>
              <p className="muted" style={{ fontSize: 13.5 }}>When deposits open, you'll get a personal USDT address (TRC-20 or BEP-20) and naira bank details with your reference. Minimum $20.</p>
              <div><span className="eyebrow">Your reference</span><code className="sel" style={{ marginTop: 6 }}>NV-{acct.id.slice(-6).toUpperCase()}</code></div>
            </div>
            <div className="panel">
              <h3 style={{ marginBottom: 12 }}>Withdraw</h3>
              <ApiForm action="/api/withdraw" submit="Request withdrawal">
                <label>Amount (USDT)<input id="amount" name="amount" inputMode="decimal" disabled={!open} /></label>
                <label>Wallet address or bank account<input id="destination" name="destination" disabled={!open} /></label>
              </ApiForm>
            </div>
          </div>
          <div className="panel table-wrap">
            <h3 style={{ marginBottom: 12 }}>History</h3>
            {acct.ledger.length === 0 ? <p className="empty">No deposits or withdrawals yet.</p> : (
              <table><thead><tr><th>Date</th><th>Type</th><th className="r">Amount</th><th>Status</th><th>Reference</th></tr></thead>
                <tbody>{acct.ledger.map((l) => <tr key={l.id}><td className="mono">{l.createdAt.toLocaleDateString("en-GB")}</td><td>{l.type.toLowerCase()}</td><td className="r mono">{Number(l.amount).toFixed(2)} {l.asset}</td><td><Status s={l.status} /></td><td className="mono">{l.reference}</td></tr>)}</tbody></table>
            )}
          </div>
        </>
      )}
    </InvestorShell>
  );
}
