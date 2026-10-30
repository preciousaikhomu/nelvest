export type KycInput = {
  userId: string;
  idType: "NIN" | "BVN";
  idNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
};

export type KycResult = {
  status: "VERIFIED" | "REJECTED" | "MANUAL_REVIEW";
  providerRef?: string;
  reason?: string;
  raw?: unknown; // trimmed provider response; never includes photos
};

export interface KycProvider {
  name: string;
  verify(input: KycInput): Promise<KycResult>;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z]/g, "");

/** Compares the names/DOB the investor typed with what the ID registry returned. */
export function matchIdentity(input: KycInput, found: { first?: string; last?: string; dob?: string }): KycResult["status"] {
  const first = !!found.first && norm(found.first) === norm(input.firstName);
  const last = !!found.last && norm(found.last) === norm(input.lastName);
  const dob = !!found.dob && found.dob.slice(0, 10) === input.dateOfBirth;
  if (first && last && dob) return "VERIFIED";
  if ((first || last) && dob) return "MANUAL_REVIEW";
  return "REJECTED";
}
