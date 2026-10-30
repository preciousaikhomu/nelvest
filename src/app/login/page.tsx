import Link from "next/link";
import ApiForm from "@/components/ApiForm";
import { TopBar } from "@/components/ui";

export default function Login() {
  return (
    <>
      <TopBar />
      <main className="wrap">
        <div className="auth-card panel">
          <p className="eyebrow">Investors</p><h2 style={{ fontSize: 24 }}>Sign in</h2>
          <ApiForm action="/api/auth/login" submit="Sign in">
            <label>Email<input id="email" name="email" type="email" autoComplete="email" /></label>
            <label>Password<input id="password" name="password" type="password" autoComplete="current-password" /></label>
          </ApiForm>
          <p className="muted" style={{ fontSize: 13.5 }}>New here? <Link href="/signup">Open an account</Link></p>
        </div>
      </main>
    </>
  );
}
