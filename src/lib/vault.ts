// AES-256-GCM envelope for secrets at rest (exchange API keys, TOTP secrets).
// Format: v1:<iv b64>:<tag b64>:<ciphertext b64>
import crypto from "crypto";
import { required } from "./env";

function key(): Buffer {
  const k = Buffer.from(required("KEY_ENCRYPTION_KEY"), "base64");
  if (k.length !== 32) throw new Error("KEY_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return k;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function decrypt(blob: string): string {
  const [v, iv, tag, ct] = blob.split(":");
  if (v !== "v1") throw new Error("Unknown secret format");
  const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
