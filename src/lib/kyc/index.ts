import { KycProvider } from "./types";
import { mockProvider } from "./mock";
import { dojahProvider } from "./dojah";
import { smileProvider } from "./smileid";

export function kycProvider(): KycProvider {
  switch ((process.env.KYC_PROVIDER || "mock").toLowerCase()) {
    case "dojah": return dojahProvider;
    case "smileid": return smileProvider;
    default: return mockProvider;
  }
}
export * from "./types";
