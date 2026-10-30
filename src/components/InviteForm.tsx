"use client";
import { useState } from "react";
import ApiForm from "./ApiForm";

export default function InviteForm() {
  const [link, setLink] = useState<string | null>(null);
  return (
    <div className="stack">
      <ApiForm action="/api/admin/invite" submit="Create invite link" onDone={(d) => setLink(String(d.link ?? ""))}>
        <div className="grid2">
          <label>Email<input id="invite-email" name="email" type="email" placeholder="name@company.com" /></label>
          <label>Role<select id="invite-role" name="role"><option value="VIEWER">Viewer</option><option value="KYC_REVIEWER">KYC reviewer</option><option value="OPERATOR">Operator</option></select></label>
        </div>
      </ApiForm>
      {link && <code className="sel">{link}</code>}
    </div>
  );
}
