import ApiForm from "@/components/ApiForm";
import { TopBar } from "@/components/ui";

export default function AdminLogin() {
  return (
    <>
      <TopBar links={[["/", "Public site"]]} />
      <main className="wrap"><div className="auth-card panel">
        <p className="eyebrow">Restricted</p><h2 style={{ fontSize: 24 }}>Admin sign in</h2>
        <ApiForm action="/api/admin/login" submit="Sign in to console">
          <label>Email<input id="email" name="email" type="email" autoComplete="username" /></label>
          <label>Password<input id="password" name="password" type="password" autoComplete="current-password" /></label>
          <label>Authenticator code<input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} /></label>
        </ApiForm>
      </div></main>
    </>
  );
}
