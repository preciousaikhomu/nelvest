import { db } from "@/lib/db";
import ApiForm from "@/components/ApiForm";
import { AdminShell, PageHead, pageAdmin } from "@/components/shells";
import { Status } from "@/components/ui";
import { MODELS } from "@/lib/engine/models";
import { tradingMode } from "@/lib/env";

export const dynamic = "force-dynamic";
const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];

export default async function Bot() {
  const u = await pageAdmin();
  const cfg = await db.botConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const runs = await db.engineRun.findMany({ orderBy: { startedAt: "desc" }, take: 8 });
  const owner = u.adminRole === "OWNER", operator = owner || u.adminRole === "OPERATOR";
  return (
    <AdminShell user={u} current="/admin/bot">
      <PageHead eyebrow={`Console · ${tradingMode()} mode`} title="Bot control" right={<Status s={cfg.state} />} />
      {operator && <div className="panel" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <ApiForm action="/api/admin/bot" submit={cfg.state === "RUNNING" ? "Pause bot" : "Start bot"} className="inline-form"><input type="hidden" name="state" value={cfg.state === "RUNNING" ? "PAUSED" : "RUNNING"} /></ApiForm>
        <ApiForm action="/api/admin/run" submit="Run engine now" className="inline-form" />
        <span style={{ marginLeft: "auto" }}><ApiForm action="/api/admin/bot/stop" submit="Emergency stop" className="inline-form" danger /></span>
      </div>}
      <div className="panel">
        <ApiForm action="/api/admin/bot" submit="Save settings">
          {!owner && <p className="callout">Only the owner can change strategy and limits.</p>}
          <div className="params">
            <label>Strategy<select id="strategy" name="strategy" defaultValue={cfg.strategy} disabled={!owner}>{Object.values(MODELS).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            <label>Candle timeframe<select id="timeframe" name="timeframe" defaultValue={cfg.timeframe} disabled={!owner}><option value="1h">1 hour</option><option value="4h">4 hours</option><option value="1d">1 day</option></select></label>
            <label>Max position per asset (%)<input id="maxPositionPct" name="maxPositionPct" defaultValue={String(cfg.maxPositionPct)} inputMode="decimal" disabled={!owner} /></label>
            <label>Drawdown pause (%)<input id="drawdownPausePct" name="drawdownPausePct" defaultValue={String(cfg.drawdownPausePct)} inputMode="decimal" disabled={!owner} /></label>
            <label>Min model confidence (0.50–0.95)<input id="minConfidence" name="minConfidence" defaultValue={String(cfg.minConfidence)} inputMode="decimal" disabled={!owner} /></label>
            <label>Trades per account per day<input id="dailyTradeCap" name="dailyTradeCap" defaultValue={String(cfg.dailyTradeCap)} inputMode="numeric" disabled={!owner} /></label>
          </div>
          <div><h3 style={{ marginBottom: 6 }}>Pairs</h3>
            {PAIRS.map((p) => <label key={p} className="toggle" style={{ display: "flex" }}><span className="mono">{p}</span><input type="checkbox" id={`pair_${p}`} name={`pair_${p}`} defaultChecked={cfg.pairs.includes(p)} disabled={!owner} style={{ width: "auto" }} /></label>)}
          </div>
        </ApiForm>
      </div>
      <div className="panel table-wrap">
        <h3 style={{ marginBottom: 12 }}>Recent engine runs</h3>
        {runs.length === 0 ? <p className="empty">No runs yet. Start the bot, then press Run engine now.</p> : (
          <table><thead><tr><th>Started</th><th>Mode</th><th>Result</th></tr></thead>
            <tbody>{runs.map((r) => <tr key={r.id}><td className="mono">{r.startedAt.toLocaleString("en-GB")}</td><td>{r.mode.toLowerCase()}</td><td className={r.error ? "down" : "muted"} style={{ whiteSpace: "normal" }}>{r.error ?? JSON.stringify(r.summary)}</td></tr>)}</tbody></table>
        )}
      </div>
    </AdminShell>
  );
}
