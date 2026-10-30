import crypto from "crypto";
import { KycProvider } from "./types";
import { required } from "../env";

// Smile ID Enhanced KYC (synchronous ID lookup). Docs: https://docs.usesmileid.com
// Signature: base64(HMAC-SHA256(api_key, timestamp + partner_id + "sid_request")).
// Verify endpoint, id_type values and response codes against current docs before going live.
export const smileProvider: KycProvider = {
  name: "smileid",
  async verify(input) {
    const partnerId = required("SMILE_PARTNER_ID");
    const apiKey = required("SMILE_API_KEY");
    const base = process.env.SMILE_BASE_URL || "https://testapi.smileidentity.com/v1";
    const timestamp = new Date().toISOString();
    const signature = crypto.createHmac("sha256", apiKey).update(timestamp + partnerId + "sid_request").digest("base64");
    const jobId = `nv_${input.userId}_${Date.now()}`;
    const res = await fetch(`${base}/id_verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_id: partnerId, timestamp, signature, source_sdk: "rest_api", source_sdk_version: "1.0.0",
        country: "NG", id_type: input.idType === "BVN" ? "BVN" : "NIN_V2", id_number: input.idNumber,
        first_name: input.firstName, last_name: input.lastName, dob: input.dateOfBirth,
        partner_params: { job_id: jobId, user_id: input.userId, job_type: 5 },
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { ResultCode?: string; ResultText?: string; SmileJobID?: string; Actions?: Record<string, string> };
    if (!res.ok) return { status: "MANUAL_REVIEW", reason: `Smile ID returned ${res.status}`, raw: { status: res.status } };
    // 1012 = ID validated. Name/DOB matches are reported in Actions.
    const a = json.Actions ?? {};
    const exact = json.ResultCode === "1012" && a.Names === "Exact Match" && a.DOB === "Exact Match";
    const partial = json.ResultCode === "1012";
    return {
      status: exact ? "VERIFIED" : partial ? "MANUAL_REVIEW" : "REJECTED",
      providerRef: json.SmileJobID, reason: json.ResultText,
      raw: { code: json.ResultCode, actions: a },
    };
  },
};
