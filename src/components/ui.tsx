import Link from "next/link";
import { ReactNode } from "react";
import { depositsEnabled, tradingMode } from "@/lib/env";
import NavMenu from "./NavMenu";

export function TopBar({ links, sections, sectionLabel, who }: { links?: [string, string][]; sections?: [string, string][]; sectionLabel?: string; who?: ReactNode }) {
  const nav: [string, string][] = links ?? [["/", "Home"], ["/signup", "Open account"], ["/login", "Sign in"]];
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link className="brand" href="/"><span className="mark" aria-hidden="true" />Nelvest</Link>
          <NavMenu links={nav} sections={sections} sectionLabel={sectionLabel} who={who} />
        </div>
      </header>
      <ModeNotice />
    </>
  );
}

export function ModeNotice() {
  const mode = tradingMode();
  if (mode === "live" && depositsEnabled()) return null;
  return (
    <div className="notice"><div className="wrap">
      <span className="chip warn"><span className="dot" />{mode === "paper" ? "Test mode" : mode === "testnet" ? "Testnet" : "Pre-launch"}</span>
      <span>SEC Nigeria registration in progress. {mode === "paper" ? "Trades are simulated with test funds. No real money moves." : "Deposits open after approval."}</span>
    </div></div>
  );
}

export function SideNav({ items, current, who }: { items: [string, string][]; current: string; who: ReactNode }) {
  return (
    <aside className="side" aria-label="Section menu">
      <div className="who">{who}</div>
      {items.map(([h, l]) => <Link key={h} href={h} aria-current={current === h ? "page" : undefined}>{l}</Link>)}
    </aside>
  );
}

export function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "up" | "down" }) {
  return <div className="panel kpi"><span className="eyebrow">{label}</span><b className={tone}>{value}</b>{note && <span className="muted" style={{ fontSize: 12 }}>{note}</span>}</div>;
}

const tones: Record<string, string> = { VERIFIED: "good", ACTIVE: "good", RUNNING: "good", BUY: "good", PENDING: "warn", MANUAL_REVIEW: "warn", PAUSED: "warn", SELL: "warn", REJECTED: "bad", STOPPED: "bad", REVOKED: "bad", NOT_STARTED: "" };
export function Status({ s }: { s: string }) {
  return <span className={`chip ${tones[s] ?? ""}`}><span className="dot" />{s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</span>;
}

export const usd = (n: number) => (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Server-rendered line chart. */
export function LineChart({ points, label }: { points: { t: Date; v: number }[]; label: string }) {
  if (points.length < 2) return <p className="empty">The chart appears after the bot's first two runs.</p>;
  const W = 640, H = 240, P = { l: 56, r: 12, t: 12, b: 28 };
  const vs = points.map((p) => p.v); const min = Math.min(...vs) * 0.995, max = Math.max(...vs) * 1.005 || 1;
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / (points.length - 1);
  const y = (v: number) => P.t + ((max - v) * (H - P.t - P.b)) / (max - min || 1);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  const fmtD = (t: Date) => t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((t) => (<g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line)" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="var(--muted)">{Math.round(t).toLocaleString("en-US")}</text></g>))}
      <path d={`${d}L${x(points.length - 1)},${H - P.b}L${P.l},${H - P.b}Z`} fill="var(--accent)" fillOpacity={0.1} />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} />
      <circle cx={x(points.length - 1)} cy={y(vs[vs.length - 1])} r={4} fill="var(--accent)" />
      <text x={P.l} y={H - 8} fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="var(--muted)">{fmtD(points[0].t)}</text>
      <text x={W - P.r} y={H - 8} textAnchor="end" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="var(--muted)">{fmtD(points[points.length - 1].t)}</text>
    </svg>
  );
}
