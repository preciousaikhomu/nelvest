"use client";
import { useState } from "react";
import ApiForm from "@/components/ApiForm";

export default function Setup() {
  const [otp, setOtp] = useState<{ otpauth: string; secret: string } | null>(null);
  return (
    <main className="wrap"><div className="auth-card panel">
      <p className="eyebrow">First-time setup</p><h2 style={{ fontSize: 24 }}>Create the owner account</h2>
      {otp ? (
        <div className="stack">
          <p>Open Google Authenticator or Authy, tap <b>+</b>, choose <b>Enter a setup key</b>, and paste this key. Then <a href="/admin/login">sign in</a>.</p>
          <code className="sel">{otp.secret}</code>
          <p className="muted" style={{ fontSize: 13.5 }}>Keep this key private. This page will not show it again.</p>
        </div>
      ) : (
        <ApiForm action="/api/admin/setup" submit="Create owner account" onDone={(d) => setOtp({ otpauth: String(d.otpauth), secret: String(d.secret) })}>
          <p className="muted" style={{ fontSize: 13.5 }}>This works once. The setup token is in your Vercel project under Settings → Environment Variables → SETUP_TOKEN.</p>
          <label>Setup token<input id="token" name="token" autoComplete="off" /></label>
          <label>Email<input id="email" name="email" type="email" autoComplete="username" /></label>
          <div className="grid2"><label>First name<input id="firstName" name="firstName" /></label><label>Last name<input id="lastName" name="lastName" /></label></div>
          <label>Password (12+ characters)<input id="password" name="password" type="password" autoComplete="new-password" /></label>
        </ApiForm>
      )}
    </div></main>
  );
}
