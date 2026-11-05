const enc = new TextEncoder();

async function importKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}
const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) =>
  /^[0-9a-f]{64}$/i.test(hex) ? new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16))) : null;

export async function hmacHex(secret: string, message: string) {
  return toHex(await crypto.subtle.sign("HMAC", await importKey(secret, "sign"), enc.encode(message)));
}

export async function hmacVerify(secret: string, message: string, hex: string) {
  const sig = fromHex(hex);
  if (!sig) return false;
  return crypto.subtle.verify("HMAC", await importKey(secret, "verify"), sig, enc.encode(message));
}