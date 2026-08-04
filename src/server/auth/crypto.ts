import { createHash, createHmac, randomBytes } from "node:crypto";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashRateLimitKey(
  secret: string,
  action: string,
  subject: string,
): string {
  return createHmac("sha256", secret)
    .update(`${action}:${subject}`)
    .digest("hex");
}
