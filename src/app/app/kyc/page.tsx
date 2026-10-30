import { db } from "@/lib/db";
import ApiForm from "@/components/ApiForm";
import { InvestorShell, PageHead, pageInvestor } from "@/components/shells";
import { Status } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Kyc() {
  const u = await pageInvestor();
  const last = await db.kycSubmission.findFirst({ where: { userId: u.id }, orderBy: { createdAt: "desc" } });
  const canSubmit = u.kycStatus === "NOT_STARTED" || u.kycStatus === "REJECTED";
  return (
    <InvestorShell user={u} current="/app/kyc">
      <PageHead eyebrow="Know your customer" title="Identity check" right={<Status s={u.kycStatus} />} />
      {last && <div className="panel" style={{ fontSize: 13.5 }}>Last submission: {last.idType} ending {last.idNumberLast4}, {last.createdAt.toLocaleDateString("en-GB")}. {last.reviewNote ? `Reviewer note: ${last.reviewNote}` : ""}</div>}
      {canSubmit ? (
        <div className="panel">
          <ApiForm action="/api/kyc" submit="Verify my identity">
            <p className="muted" style={{ fontSize: 13.5 }}>We check your details against the national ID registry. Your name must match your account name: {u.firstName} {u.lastName}. We store only the last 4 digits of your ID number.</p>
            <div className="grid2">
              <label>ID type<select id="idType" name="idType"><option value="NIN">NIN</option><option value="BVN">BVN</option></select></label>
              <label>ID number<input id="idNumber" name="idNumber" inputMode="numeric" maxLength={11} autoComplete="off" /></label>
            </div>
            <label>Date of birth<input id="dateOfBirth" name="dateOfBirth" type="date" /></label>
            <label>Residential address<input id="address" name="address" autoComplete="street-address" /></label>
          </ApiForm>
        </div>
      ) : (
        <div className="panel"><p>{u.kycStatus === "VERIFIED" ? "You're verified. You can invest." : "Thanks. A reviewer checks your details within 24 hours. You'll see the result here."}</p></div>
      )}
    </InvestorShell>
  );
}
