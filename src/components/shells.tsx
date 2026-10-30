import { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { TopBar, SideNav, Status } from "./ui";
import LogoutButton from "./LogoutButton";

export async function pageInvestor(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role === "ADMIN") redirect("/admin");
  return u;
}

export async function pageAdmin(): Promise<User> {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") redirect("/admin/login");
  return u;
}

export function InvestorShell({ user: u, current, children }: { user: User; current: string; children: ReactNode }) {
  return (
    <>
      <TopBar links={[["/", "Home"], ["/app", "Dashboard"]]} />
      <div className="wrap shell">
        <SideNav current={current} who={<><b>{u.firstName} {u.lastName}</b><Status s={u.kycStatus} /><LogoutButton /></>}
          items={[["/app", "Portfolio"], ["/app/kyc", "Identity"], ["/app/funds", "Deposit & withdraw"], ["/app/connect", "Connect exchange"], ["/app/trades", "Trade history"]]} />
        <div className="main">{children}</div>
      </div>
    </>
  );
}

const ADMIN_NAV: [string, string][] = [["/admin", "Overview"], ["/admin/investors", "Investors & KYC"], ["/admin/bot", "Bot control"], ["/admin/admins", "Admins"], ["/admin/audit", "Audit log"]];

export function AdminShell({ user: u, current, children }: { user: User; current: string; children: ReactNode }) {
  return (
    <>
      <TopBar links={[["/", "Public site"], ["/admin", "Console"]]} />
      <div className="wrap shell">
        <SideNav current={current} items={ADMIN_NAV}
          who={<><b>{u.firstName} {u.lastName}</b><span className="chip gold">{(u.adminRole ?? "").replace("_", " ").toLowerCase()}</span><LogoutButton /></>} />
        <div className="main">{children}</div>
      </div>
    </>
  );
}

export function PageHead({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{right}</div>;
}
