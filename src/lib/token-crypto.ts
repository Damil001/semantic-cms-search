// Web Crypto (not node:crypto) so this also loads in Edge routes.
const PREFIX = "enc:v1:";

let cachedKey: Promise<CryptoKey> | null = null;

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64Decode(value: string): Uint8Array<ArrayBuffer> {
  const std = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(std + "=".repeat((4 - (std.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function rawKey(): Uint8Array<ArrayBuffer> {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be set (32 random bytes, base64 or hex) to store Webflow tokens"
    );
  }
  const bytes = /^[0-9a-f]{64}$/i.test(raw)
    ? Uint8Array.from(raw.match(/../g)!.map((h) => Number.parseInt(h, 16)))
    : b64Decode(raw);
  if (bytes.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return bytes;
}

function key(): Promise<CryptoKey> {
  cachedKey ??= crypto.subtle.importKey("raw", rawKey(), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

/** AES-256-GCM; output is `enc:v1:<iv>:<ciphertext+tag>` (base64url parts). */
export async function encryptToken(plain: string): Promise<string> {
  if (!plain) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain))
  );
  return `${PREFIX}${b64urlEncode(iv)}:${b64urlEncode(ct)}`;
}

/** Rows written before encryption was enabled are returned unchanged. */
export async function decryptToken(stored: string | null | undefined): Promise<string> {
  if (!stored) return "";
  if (!isEncryptedToken(stored)) return stored;
  const [iv, ct] = stored.slice(PREFIX.length).split(":");
  if (!iv || !ct) throw new Error("Malformed encrypted token");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64Decode(iv) },
    await key(),
    b64Decode(ct)
  );
  return new TextDecoder().decode(plain);
}
