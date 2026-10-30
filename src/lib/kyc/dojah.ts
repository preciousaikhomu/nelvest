import { KycProvider, matchIdentity } from "./types";
import { required } from "../env";

// Dojah KYC lookups. Docs: https://docs.dojah.io  (verify paths and field names against current docs before going live)
export const dojahProvider: KycProvider = {
  name: "dojah",
  async verify(input) {
    const base = process.env.DOJAH_BASE_URL || "https://sandbox.dojah.io";
    const path = input.idType === "BVN"
      ? `/api/v1/kyc/bvn/full?bvn=${encodeURIComponent(input.idNumber)}`
      : `/api/v1/kyc/nin?nin=${encodeURIComponent(input.idNumber)}`;
    const res = await fetch(base + path, {
      headers: { AppId: required("DOJAH_APP_ID"), Authorization: required("DOJAH_SECRET_KEY") },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { entity?: Record<string, string>; error?: string };
    if (!res.ok || !json.entity) {
      return { status: "MANUAL_REVIEW", reason: json.error || `Dojah returned ${res.status}`, raw: { status: res.status } };
    }
    const e = json.entity;
    const status = matchIdentity(input, {
      first: e.first_name ?? e.firstname,
      last: e.last_name ?? e.surname,
      dob: e.date_of_birth ?? e.birthdate,
    });
    return { status, providerRef: e.reference_id ?? undefined, raw: { matched: status } };
  },
};
