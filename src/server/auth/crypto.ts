import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

const PASSWORD_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
const PASSWORD_DIGITS = "23456789";

/** Random password that satisfies the app's policy (letter + digit, >=10). */
export function generateTemporaryPassword(length = 14): string {
  const pool = PASSWORD_LETTERS + PASSWORD_DIGITS;
  const chars = [
    PASSWORD_LETTERS[randomInt(PASSWORD_LETTERS.length)]!,
    PASSWORD_DIGITS[randomInt(PASSWORD_DIGITS.length)]!,
    ...Array.from({ length: length - 2 }, () => pool[randomInt(pool.length)]!),
  ];
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapWith = randomInt(index + 1);
    [chars[index], chars[swapWith]] = [chars[swapWith]!, chars[index]!];
  }
  return chars.join("");
}

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
