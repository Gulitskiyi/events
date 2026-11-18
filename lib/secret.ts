import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "enc:v1:";

function dataKey() {
  const raw = process.env.DATA_KEY?.trim() || "";
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  if (raw.length >= 16) return scryptSync(raw, "land-data-v1", 32);
  throw new Error("DATA_KEY is missing");
}

export function encryptField(plain: string) {
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

export function decryptField(value: string) {
  if (!value.startsWith(PREFIX)) return value;
  const buf = Buffer.from(value.slice(PREFIX.length), "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", dataKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function phoneKey(phoneNorm: string) {
  return createHmac("sha256", dataKey()).update(`phone:${phoneNorm}`).digest("base64url");
}

export function isSealed(value: string) {
  return value.startsWith(PREFIX);
}
