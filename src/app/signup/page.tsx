import ApiForm from "@/components/ApiForm";
import { TopBar } from "@/components/ui";

export default function Signup() {
  return (
    <>
      <TopBar />
      <main className="wrap" style={{ paddingBlock: 48, maxWidth: 720 }}>
        <div className="stack" style={{ marginBottom: 24 }}><p className="eyebrow">Open an account · identity check comes next</p><h2>Create your Nelvest account</h2></div>
        <ApiForm action="/api/auth/signup" submit="Create account and verify identity">
          <fieldset className="panel stack" style={{ margin: 0 }}>
            <legend className="eyebrow">1 · Your details</legend>
            <div className="grid2"><label>First name (as on your ID)<input id="firstName" name="firstName" autoComplete="given-name" required /></label><label>Last name<input id="lastName" name="lastName" autoComplete="family-name" required /></label></div>
            <label>Email<input id="email" name="email" type="email" autoComplete="email" required /></label>
            <label>Phone<input id="phone" name="phone" autoComplete="tel" placeholder="+234" required /></label>
            <label>Password<input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
          </fieldset>
          <fieldset className="panel stack" style={{ margin: 0 }}>
            <legend className="eyebrow">2 · Risk profile</legend>
            <label>Investing experience<select id="experience" name="experience" defaultValue="Some experience"><option>New to crypto</option><option>Some experience</option><option>Active trader</option></select></label>
            <label>If your balance fell 20% in a month, you would…<select id="drawdownAction" name="drawdownAction" defaultValue="Wait and review"><option>Withdraw everything</option><option>Wait and review</option><option>Add more funds</option></select></label>
            <label>Source of funds<select id="sourceOfFunds" name="sourceOfFunds" defaultValue="Salary"><option>Salary</option><option>Business income</option><option>Savings</option><option>Other</option></select></label>
            <label className="choice"><input type="checkbox" id="ack" name="ack" /><span>I have read the risk disclosure and understand I can lose money.</span></label>
          </fieldset>
          <fieldset className="panel stack" style={{ margin: 0 }}>
            <legend className="eyebrow">3 · How you want to invest</legend>
            <label className="choice"><input type="radio" id="mode-managed" name="mode" value="MANAGED" defaultChecked /><span><b>Managed account</b><br /><span className="muted">Deposit with Nelvest. The desk and bot trade for you.</span></span></label>
            <label className="choice"><input type="radio" id="mode-byo" name="mode" value="BYO" /><span><b>Bring your own exchange</b><br /><span className="muted">Connect a trade-only API key. Your funds never leave your exchange.</span></span></label>
          </fieldset>
        </ApiForm>
      </main>
    </>
  );
}
