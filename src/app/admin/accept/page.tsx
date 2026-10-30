"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ApiForm from "@/components/ApiForm";

function Accept() {
  const token = useSearchParams().get("token") ?? "";
  const [otp, setOtp] = useState<{ otpauth: string; secret: string } | null>(null);
  return (
    <main className="wrap"><div className="auth-card panel">
      <p className="eyebrow">Nelvest admin invite</p><h2 style={{ fontSize: 24 }}>Set up your admin account</h2>
      {otp ? (
        <div className="stack">
          <p>Add this key to Google Authenticator or Authy, then <a href="/admin/login">sign in</a>.</p>
          <code className="sel">{otp.secret}</code>
          <p className="muted" style={{ fontSize: 13.5 }}>Or paste this setup link into your authenticator:</p>
          <code className="sel">{otp.otpauth}</code>
        </div>
      ) : (
        <ApiForm action="/api/admin/invite/accept" submit="Create admin account" onDone={(d) => setOtp({ otpauth: String(d.otpauth), secret: String(d.secret) })}>
          <input type="hidden" name="token" value={token} />
          <div className="grid2"><label>First name<input id="firstName" name="firstName" /></label><label>Last name<input id="lastName" name="lastName" /></label></div>
          <label>Password (12+ characters)<input id="password" name="password" type="password" autoComplete="new-password" /></label>
        </ApiForm>
      )}
    </div></main>
  );
}
export default function Page() { return <Suspense><Accept /></Suspense>; }
