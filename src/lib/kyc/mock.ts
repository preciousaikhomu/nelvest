import { KycProvider } from "./types";

/** Test provider. ID numbers ending in 0 are rejected, ending in 5 go to manual review, all others pass. */
export const mockProvider: KycProvider = {
  name: "mock",
  async verify(input) {
    const last = input.idNumber.slice(-1);
    const status = last === "0" ? "REJECTED" : last === "5" ? "MANUAL_REVIEW" : "VERIFIED";
    return { status, providerRef: `mock_${Date.now()}`, reason: status === "VERIFIED" ? undefined : "Mock rule", raw: { mock: true } };
  },
};
