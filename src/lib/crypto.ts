import crypto from "node:crypto";

/**
 * Cifrado de tokens de pagina. AES-256-GCM.
 * Formato guardado: base64( iv[12] | tag[16] | ciphertext )
 */

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("Falta TOKEN_ENCRYPTION_KEY");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY debe ser 32 bytes en base64 (openssl rand -base64 32)");
  }
  return k;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}
